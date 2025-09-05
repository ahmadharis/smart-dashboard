import type { NextRequest } from "next/server"
import { validatePublicAccessByToken } from "@/lib/public-auth"
import { createClient } from "@/lib/supabase/server"
import { createSecureResponse } from "@/lib/security"

export async function OPTIONS() {
  return createSecureResponse({})
}

export async function GET(request: NextRequest, { params }: { params: { token: string } }) {
  try {
    console.log("[v0] Public data files API called with token:", params.token)

    const authResult = await validatePublicAccessByToken(params.token)
    if (!authResult.isValid || !authResult.share || !authResult.tenant) {
      console.log("[v0] Auth validation failed:", authResult.error)
      return createSecureResponse({ error: authResult.error || "Access denied" }, 403)
    }

    console.log(
      "[v0] Auth validated for dashboard:",
      authResult.share.dashboard_id,
      "tenant:",
      authResult.tenant.tenant_id,
    )

    const supabase = await createClient()

    const { data: dataFiles, error: dataFilesError } = await supabase
      .from("data_files")
      .select("*") // Select all columns to match internal API
      .eq("dashboard_id", authResult.share.dashboard_id)
      .eq("tenant_id", authResult.tenant.tenant_id)
      .order("sort_order", { ascending: true })

    if (dataFilesError) {
      console.error("[v0] Data files query error:", dataFilesError)
      return createSecureResponse({ error: "Failed to fetch data files" }, 500)
    }

    console.log("[v0] Found data files:", dataFiles?.length || 0)
    console.log(
      "[v0] Data files details:",
      dataFiles?.map((f) => ({
        id: f.id,
        hasData: !!f.json_data, // Check json_data instead of data
        dataLength: f.json_data
          ? typeof f.json_data === "string"
            ? f.json_data.length
            : JSON.stringify(f.json_data).length
          : 0,
      })),
    )

    const mappedFiles = (dataFiles || []).map((file) => ({
      id: file.id,
      name: file.filename, // Map filename to name
      type: file.data_type, // Map data_type to type
      data: file.json_data, // Map json_data to data
      updated_at: file.updated_at,
      chart_type: file.chart_type,
      sort_order: file.sort_order,
      dashboard_id: file.dashboard_id,
      field_order: file.field_order, // Include field_order for chart rendering
    }))

    return createSecureResponse(mappedFiles)
  } catch (error) {
    console.error("[v0] Error fetching shared dashboard data files:", error)
    return createSecureResponse({ error: "Internal server error" }, 500)
  }
}
