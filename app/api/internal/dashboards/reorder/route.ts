import { type NextRequest, NextResponse } from "next/server"
import { validateAuthAndTenant } from "@/lib/auth-middleware"
import { createServiceClient } from "@/lib/supabase"

const supabase = createServiceClient()

export async function PATCH(request: NextRequest) {
  try {
    const authResult = await validateAuthAndTenant(request, true)
    if (!authResult.isValid || !authResult.tenantId) {
      return NextResponse.json({ error: authResult.error || "Authentication required" }, { status: 401 })
    }

    const body = await request.json()
    const { tenantId: bodyTenantId, updates } = body

    const tenantId = authResult.tenantId
    if (bodyTenantId && bodyTenantId !== tenantId) {
      return NextResponse.json({ error: "Tenant ID mismatch" }, { status: 403 })
    }

    if (!Array.isArray(updates) || updates.length === 0) {
      return NextResponse.json({ error: "Updates array is required" }, { status: 400 })
    }

    const updatePromises = updates.map(({ id, sort_order }) =>
      supabase.from("dashboards").update({ sort_order }).eq("id", id).eq("tenant_id", tenantId),
    )

    const results = await Promise.all(updatePromises)
    const errors = results.filter((result) => result.error)

    if (errors.length > 0) {
      console.error("❌ Database errors:", errors)
      return NextResponse.json({ error: "Failed to update dashboard order" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Internal API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
