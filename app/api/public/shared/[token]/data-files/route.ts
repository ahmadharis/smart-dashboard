import type { NextRequest } from "next/server"
import { validatePublicAccessByToken } from "@/lib/public-auth"
import { createClient } from "@/lib/supabase/server"
import { createSecureResponse } from "@/lib/security"

export async function OPTIONS() {
  return createSecureResponse({})
}

export async function GET(request: NextRequest, { params }: { params: { token: string } }) {
  try {
    const authResult = await validatePublicAccessByToken(params.token)
    if (!authResult.isValid || !authResult.share || !authResult.tenant) {
      return createSecureResponse({ error: authResult.error || "Access denied" }, 403)
    }

    const supabase = await createClient()

    const { data: dataFiles, error: dataFilesError } = await supabase
      .from("data_files")
      .select("*")
      .eq("dashboard_id", authResult.share.dashboard_id)
      .eq("tenant_id", authResult.tenant.tenant_id)
      .order("sort_order", { ascending: true })

    if (dataFilesError) {
      console.error("Data files query error:", dataFilesError)
      return createSecureResponse({ error: "Failed to fetch data files" }, 500)
    }

    return createSecureResponse(dataFiles || [])
  } catch (error) {
    console.error("Error fetching shared dashboard data files:", error)
    return createSecureResponse({ error: "Internal server error" }, 500)
  }
}
