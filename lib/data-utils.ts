import { createClient } from "@/lib/supabase"

export interface DataFile {
  id?: string // Added optional id field
  name: string
  type: string
  data: DataPoint[]
  created_at?: string // Added created_at field
  updated_at?: string // Changed from lastModified to updated_at
  chart_type?: string // Added chart_type field
  dashboard_id?: string // Added dashboard_id field
  sort_order?: number // Added sort_order field
  tenant_id?: string // Add tenant_id field
  field_order?: string[] // Added field_order field
}

export interface DataPoint {
  date: string
  value: number
  [key: string]: any
}

function normalizeDate(dateStr: string): string {
  if (!dateStr || dateStr === "Invalid Date") {
    return new Date().toISOString().split("T")[0] // Return today's date as fallback
  }

  // Handle mm/dd/yyyy format
  const mmddyyyyMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (mmddyyyyMatch) {
    const [, month, day, year] = mmddyyyyMatch
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`
  }

  // Handle yyyy/mm/dd format
  const yyyymmddMatch = dateStr.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/)
  if (yyyymmddMatch) {
    const [, year, month, day] = yyyymmddMatch
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`
  }

  // Try to parse as existing date and convert to ISO format
  const parsedDate = new Date(dateStr)
  if (!isNaN(parsedDate.getTime())) {
    return parsedDate.toISOString().split("T")[0]
  }

  // Fallback to today's date
  return new Date().toISOString().split("T")[0]
}

export function transformDataForCharts(rawData: any): DataPoint[] {
  if (typeof rawData === "string") {
    try {
      // Try to parse as JSON first
      if (rawData.trim().startsWith("[") || rawData.trim().startsWith("{")) {
        const parsedData = JSON.parse(rawData)
        if (Array.isArray(parsedData)) {
          return parsedData.map((item) => ({
            date: normalizeDate(String(item.date)),
            value: typeof item.value === "number" ? item.value : Number.parseFloat(item.value) || 0,
            ...item,
          }))
        }
      }

      // Handle XML string data (existing logic)
      if (rawData.includes("<resultset")) {
        const dataPoints: DataPoint[] = []

        // Extract all <row> elements using regex
        const rowMatches = rawData.match(/<row[^>]*>.*?<\/row>/g)

        if (rowMatches) {
          rowMatches.forEach((rowXml) => {
            // Extract date and value from each row
            const dateMatch = rowXml.match(/<date>(.*?)<\/date>/)
            const valueMatch = rowXml.match(/<value>(.*?)<\/value>/)

            if (dateMatch && valueMatch) {
              const dateStr = dateMatch[1].trim()
              const valueStr = valueMatch[1].trim()
              const value = Number.parseFloat(valueStr) || 0

              dataPoints.push({
                date: normalizeDate(dateStr),
                value: value,
                originalDate: dateStr,
                originalValue: valueStr,
              })
            }
          })
        }

        return dataPoints
      }
    } catch (error) {
      console.error("Error parsing string data:", error)
      return []
    }
  }

  // Handle array data (existing logic)
  if (!Array.isArray(rawData)) {
    return []
  }

  return rawData.map((item, index) => {
    // Try to find date field (common field names)
    const dateField = item.date || item.Date || item.DATE || item.timestamp || item.created_at || item.time

    // Try to find value field (common field names)
    const valueField =
      item.value || item.Value || item.amount || item.count || item.total || item.quantity || item.price

    // If no recognizable fields, create basic structure
    const date = dateField ? normalizeDate(String(dateField)) : new Date().toISOString().split("T")[0]
    const value =
      typeof valueField === "number"
        ? valueField
        : typeof valueField === "string"
          ? Number.parseFloat(valueField) || index + 1
          : index + 1

    return {
      date,
      value,
      ...item, // Include all original fields
    }
  })
}

export async function getDataFiles(tenantId: string, dashboardId?: string | null): Promise<DataFile[]> {
  try {
    const supabase = await createClient()

    let query = supabase
      .from("data_files")
      .select("*")
      .eq("tenant_id", tenantId) // Filter by tenant
      .order("sort_order", { ascending: true })

    // Filter by dashboard if specified
    if (dashboardId) {
      query = query.eq("dashboard_id", dashboardId)
    }

    const { data, error } = await query

    if (error) {
      console.error("Error fetching data files:", error)
      return []
    }

    return (
      data?.map((file) => ({
        id: file.id,
        name: file.filename,
        type: file.data_type,
        data: file.json_data,
        created_at: file.created_at,
        updated_at: file.updated_at || file.created_at,
        chart_type: file.chart_type || "line",
        dashboard_id: file.dashboard_id,
        sort_order: file.sort_order || 0,
        tenant_id: file.tenant_id, // Include tenant_id
        field_order: file.field_order, // Include field_order
      })) || []
    )
  } catch (error) {
    console.error("Error in getDataFiles:", error)
    return []
  }
}

export async function saveDataFile(
  filename: string,
  dataType: string,
  jsonData: any[],
  tenantId: string, // Add tenant parameter
  dashboardId?: string,
  dashboardTitle?: string,
  fieldOrder?: string[], // Added optional field order parameter
): Promise<{ success: boolean; dashboard_id?: string } | boolean> {
  try {
    const supabase = await createClient()

    let finalDashboardId = dashboardId

    // If no dashboard ID provided but title is provided, create new dashboard
    if (!finalDashboardId && dashboardTitle) {
      const { data: maxSortOrder } = await supabase
        .from("dashboards")
        .select("sort_order")
        .eq("tenant_id", tenantId) // Filter by tenant
        .order("sort_order", { ascending: false })
        .limit(1)
        .single()

      const nextSortOrder = (maxSortOrder?.sort_order || 0) + 1

      const { data: newDashboard, error: dashboardError } = await supabase
        .from("dashboards")
        .insert({
          tenant_id: tenantId, // Include tenant_id
          title: dashboardTitle,
          sort_order: nextSortOrder,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (dashboardError) {
        console.error("Error creating dashboard:", dashboardError)
        return false
      }

      finalDashboardId = newDashboard.id
    }

    if (!finalDashboardId) {
      return false // Require explicit dashboard
    }

    const { data: existingData, error: checkError } = await supabase
      .from("data_files")
      .select("id")
      .eq("data_type", dataType)
      .eq("dashboard_id", finalDashboardId)
      .eq("tenant_id", tenantId)
      .single()

    if (checkError && checkError.code !== "PGRST116") {
      // PGRST116 is "not found" error
      console.error("Error checking existing data file:", checkError)
      return false
    }

    const now = new Date().toISOString()

    if (existingData) {
      const updateData: any = {
        json_data: jsonData,
        updated_at: now,
      }

      if (fieldOrder) {
        updateData.field_order = fieldOrder
      }

      const { error: updateError } = await supabase.from("data_files").update(updateData).eq("id", existingData.id)

      if (updateError) {
        console.error("Error updating data file:", updateError)
        return false
      }
    } else {
      const { data: maxDataFileSortOrder } = await supabase
        .from("data_files")
        .select("sort_order")
        .eq("dashboard_id", finalDashboardId)
        .eq("tenant_id", tenantId) // Filter by tenant
        .order("sort_order", { ascending: false })
        .limit(1)
        .single()

      const nextDataFileSortOrder = (maxDataFileSortOrder?.sort_order || 0) + 1

      const insertData: any = {
        tenant_id: tenantId, // Include tenant_id
        filename,
        data_type: dataType,
        json_data: jsonData,
        dashboard_id: finalDashboardId,
        sort_order: nextDataFileSortOrder,
        created_at: now,
        updated_at: now,
      }

      if (fieldOrder) {
        insertData.field_order = fieldOrder
      }

      const { error: insertError } = await supabase.from("data_files").insert(insertData)

      if (insertError) {
        console.error("Error inserting data file:", insertError)
        return false
      }
    }

    return {
      success: true,
      dashboard_id: finalDashboardId,
    }
  } catch (error) {
    console.error("Error in saveDataFile:", error)
    return false
  }
}

export async function deleteDataFile(filename: string, tenantId: string): Promise<boolean> {
  try {
    const supabase = await createClient()
    const { error } = await supabase.from("data_files").delete().eq("filename", filename).eq("tenant_id", tenantId) // Filter by tenant

    if (error) {
      console.error("Error deleting data file:", error)
      return false
    }

    return true
  } catch (error) {
    console.error("Error in deleteDataFile:", error)
    return false
  }
}
