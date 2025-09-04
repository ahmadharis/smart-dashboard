import { type NextRequest, NextResponse } from "next/server"
import { validateAuthAndTenant } from "@/lib/auth-middleware"
import { createClient } from "@supabase/supabase-js"
import { parseXMLToJSON } from "@/lib/xml-parser"
import { saveDataFile } from "@/lib/data-utils"
import { validateDashboardId, sanitizeInput, validateDataType, createSecureErrorResponse } from "@/lib/validation"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function GET(request: NextRequest) {
  try {
    const authResult = await validateAuthAndTenant(request, true)
    if (!authResult.isValid || !authResult.tenantId) {
      return NextResponse.json({ error: authResult.error || "Authentication required" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const tenantId = authResult.tenantId
    const dashboardId = searchParams.get("dashboardId")

    if (dashboardId && !validateDashboardId(dashboardId)) {
      return createSecureErrorResponse("Invalid dashboard ID", 400)
    }

    let query = supabase
      .from("data_files")
      .select("*") // Select all columns including field_order
      .eq("tenant_id", tenantId)
      .order("sort_order", { ascending: true })

    if (dashboardId) {
      query = query.eq("dashboard_id", dashboardId)
    }

    const { data: dataFiles, error } = await query

    if (error) {
      return createSecureErrorResponse("Database error", 500, error)
    }

    const mappedFiles = (dataFiles || []).map((file) => ({
      id: file.id,
      name: file.filename,
      type: file.data_type,
      data: file.json_data, // Map json_data to data
      updated_at: file.updated_at,
      chart_type: file.chart_type,
      sort_order: file.sort_order,
      dashboard_id: file.dashboard_id, // Include dashboard_id for tags
      field_order: file.field_order, // Include field_order in response
    }))

    return NextResponse.json(mappedFiles)
  } catch (error) {
    return createSecureErrorResponse("Internal server error", 500, error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await validateAuthAndTenant(request, true)
    if (!authResult.isValid || !authResult.tenantId) {
      return NextResponse.json({ error: authResult.error || "Authentication required" }, { status: 401 })
    }

    const formData = await request.formData()
    const tenantId = authResult.tenantId
    const bodyTenantId = (formData.get("tenantId") as string) || (formData.get("tenant_id") as string)

    if (bodyTenantId && bodyTenantId !== tenantId) {
      return createSecureErrorResponse("Tenant ID mismatch", 403)
    }

    const xmlContent = formData.get("xml") as string
    const dataType = formData.get("data_type") as string
    const dashboardId = formData.get("dashboard_id") as string
    const dashboardTitle = formData.get("dashboard_title") as string

    if (!xmlContent || typeof xmlContent !== "string") {
      return createSecureErrorResponse("XML content is required", 400)
    }

    if (!dataType || !validateDataType(dataType)) {
      return createSecureErrorResponse("Invalid data type", 400)
    }

    if (dashboardId && dashboardId !== "new" && !validateDashboardId(dashboardId)) {
      return createSecureErrorResponse("Invalid dashboard ID", 400)
    }

    const sanitizedTitle = dashboardTitle ? sanitizeInput(dashboardTitle, 100) : undefined

    const { data: jsonData, fieldOrder, message } = parseXMLToJSON(xmlContent, dataType)

    const saved = await saveDataFile(
      `${dataType}.json`,
      dataType,
      jsonData,
      tenantId,
      dashboardId === "new" ? undefined : dashboardId,
      sanitizedTitle,
      fieldOrder,
    )

    if (!saved) {
      return createSecureErrorResponse("Failed to save data file", 500)
    }

    return NextResponse.json({
      success: true,
      message: message,
      recordCount: jsonData.length,
      fileName: `${dataType}.json`,
      dashboard_id: typeof saved === "object" ? saved.dashboard_id : dashboardId,
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Internal server error"
    return createSecureErrorResponse(errorMessage, 500, error)
  }
}
