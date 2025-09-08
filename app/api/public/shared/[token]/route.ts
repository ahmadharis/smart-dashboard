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

    const { data: dashboard, error: dashboardError } = await supabase
      .from("dashboards")
      .select("*")
      .eq("id", authResult.share.dashboard_id)
      .eq("tenant_id", authResult.tenant.tenant_id)
      .single()

    if (dashboardError || !dashboard) {
      return createSecureResponse({ error: "Dashboard not found" }, 404)
    }

    return createSecureResponse({
      dashboard,
      tenant: {
        tenant_id: authResult.tenant.tenant_id,
        name: authResult.tenant.name,
      },
      share: {
        view_count: authResult.share.view_count,
        expires_at: authResult.share.expires_at,
      },
    })
  } catch (error) {
    console.error("Error fetching shared dashboard:", error)
    return createSecureResponse({ error: "Internal server error" }, 500)
  }
}
