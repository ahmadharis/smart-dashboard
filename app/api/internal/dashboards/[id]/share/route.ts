import { type NextRequest, NextResponse } from "next/server"
import { validateAuthAndTenant } from "@/lib/auth-middleware"
import { createServiceClient } from "@/lib/supabase"
import { generateShareToken } from "@/lib/share-utils"

const supabase = createServiceClient()

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
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
      .select("id")
      .eq("id", dashboardId)
      .eq("tenant_id", tenantId)
      .single()

    if (dashboardError || !dashboard) {
      return NextResponse.json({ error: "Dashboard not found" }, { status: 404 })
    }

    // Get existing share if any
    const { data: share, error: shareError } = await supabase
      .from("public_dashboard_shares")
      .select("*")
      .eq("dashboard_id", dashboardId)
      .single()

    if (shareError && shareError.code !== "PGRST116") {
      // PGRST116 is "not found"
      console.error("Share query error:", shareError)
      return NextResponse.json({ error: "Failed to fetch share" }, { status: 500 })
    }

    return NextResponse.json({ share: share || null })
  } catch (error) {
    console.error("Internal API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    console.log("[v0] Starting share creation for dashboard:", params.id)

    const authResult = await validateAuthAndTenant(request, true)
    if (!authResult.isValid || !authResult.tenantId) {
      return NextResponse.json({ error: authResult.error || "Authentication required" }, { status: 401 })
    }

    const tenantId = authResult.tenantId
    const dashboardId = params.id
    const body = await request.json()
    const { expires_at } = body

    console.log("[v0] Checking public sharing setting for tenant:", tenantId)

    // Check if tenant allows public sharing
    const { data: settingData, error: settingError } = await supabase
      .from("settings")
      .select("value")
      .eq("tenant_id", tenantId)
      .eq("key", "allow_public_sharing")
      .single()

    console.log("[v0] Setting data:", settingData, "Setting error:", settingError)

    if (settingData?.value !== "true") {
      return NextResponse.json({ error: "Public sharing is disabled for this tenant" }, { status: 403 })
    }

    console.log("[v0] Verifying dashboard exists for tenant")

    // Verify dashboard belongs to tenant
    const { data: dashboard, error: dashboardError } = await supabase
      .from("dashboards")
      .select("id")
      .eq("id", dashboardId)
      .eq("tenant_id", tenantId)
      .single()

    console.log("[v0] Dashboard data:", dashboard, "Dashboard error:", dashboardError)

    if (dashboardError || !dashboard) {
      return NextResponse.json({ error: "Dashboard not found" }, { status: 404 })
    }

    // Generate new share token
    const shareToken = generateShareToken()
    console.log("[v0] Generated share token:", shareToken)

    // Create or overwrite share (UPSERT)
    const { data: share, error: shareError } = await supabase
      .from("public_dashboard_shares")
      .upsert({
        dashboard_id: dashboardId,
        share_token: shareToken,
        expires_at: expires_at || null,
        view_count: 0,
        last_accessed_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single()

    console.log("[v0] Share creation result:", share, "Share error:", shareError)

    if (shareError) {
      console.error("Share creation error:", shareError)
      return NextResponse.json({ error: "Failed to create share" }, { status: 500 })
    }

    return NextResponse.json({ share })
  } catch (error) {
    console.error("Internal API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
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
      .select("id")
      .eq("id", dashboardId)
      .eq("tenant_id", tenantId)
      .single()

    if (dashboardError || !dashboard) {
      return NextResponse.json({ error: "Dashboard not found" }, { status: 404 })
    }

    // Delete share completely
    const { error: deleteError } = await supabase
      .from("public_dashboard_shares")
      .delete()
      .eq("dashboard_id", dashboardId)

    if (deleteError) {
      console.error("Share deletion error:", deleteError)
      return NextResponse.json({ error: "Failed to delete share" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Internal API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
