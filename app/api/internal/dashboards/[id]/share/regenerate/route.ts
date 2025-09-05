import { type NextRequest, NextResponse } from "next/server"
import { validateAuthAndTenant } from "@/lib/auth-middleware"
import { createServiceClient } from "@/lib/supabase"
import { generateShareToken } from "@/lib/share-utils"

const supabase = createServiceClient()

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authResult = await validateAuthAndTenant(request, true)
    if (!authResult.isValid || !authResult.tenantId) {
      return NextResponse.json({ error: authResult.error || "Authentication required" }, { status: 401 })
    }

    const tenantId = authResult.tenantId
    const dashboardId = params.id

    // Verify dashboard belongs to tenant
    const { data: dashboard, error: dashboardError } = await supabase
      .from("dashboards")
      .select("dashboard_id")
      .eq("dashboard_id", dashboardId)
      .eq("tenant_id", tenantId)
      .single()

    if (dashboardError || !dashboard) {
      return NextResponse.json({ error: "Dashboard not found" }, { status: 404 })
    }

    // Check if share exists
    const { data: existingShare, error: shareError } = await supabase
      .from("public_dashboard_shares")
      .select("*")
      .eq("dashboard_id", dashboardId)
      .single()

    if (shareError || !existingShare) {
      return NextResponse.json({ error: "No existing share found" }, { status: 404 })
    }

    // Generate new token and update
    const newShareToken = generateShareToken()

    const { data: updatedShare, error: updateError } = await supabase
      .from("public_dashboard_shares")
      .update({
        share_token: newShareToken,
        updated_at: new Date().toISOString(),
        view_count: 0, // Reset view count on regeneration
        last_accessed_at: null,
      })
      .eq("dashboard_id", dashboardId)
      .select()
      .single()

    if (updateError) {
      console.error("Share regeneration error:", updateError)
      return NextResponse.json({ error: "Failed to regenerate share" }, { status: 500 })
    }

    return NextResponse.json({ share: updatedShare })
  } catch (error) {
    console.error("Internal API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
