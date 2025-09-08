import type { NextRequest } from "next/server"
import { validatePublicAccessByToken } from "@/lib/public-auth"
import { createServiceClient } from "@/lib/supabase"
import { createSecureResponse } from "@/lib/security"

export async function OPTIONS() {
  return createSecureResponse({})
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params
    const authResult = await validatePublicAccessByToken(token)
    if (!authResult.isValid || !authResult.share || !authResult.tenant) {
      return createSecureResponse({ error: authResult.error || "Access denied" }, 403)
    }

    const supabase = createServiceClient()

    const { data: dataFiles, error: dataFilesError } = await supabase
      .from("data_files")
      .select("*") // Select all columns to match internal API
      .eq("dashboard_id", authResult.share.dashboard_id)
      .eq("tenant_id", authResult.tenant.tenant_id)
      .order("sort_order", { ascending: true })

    if (dataFilesError) {
      return createSecureResponse({ error: "Failed to fetch data files" }, 500)
    }

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
    return createSecureResponse({ error: "Internal server error" }, 500)
  }
}
