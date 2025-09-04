import { type NextRequest, NextResponse } from "next/server"
import { validateAuthAndTenant } from "@/lib/auth-middleware"
import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authResult = await validateAuthAndTenant(request, true)
    if (!authResult.isValid || !authResult.tenantId) {
      return NextResponse.json({ error: authResult.error || "Authentication required" }, { status: 401 })
    }

    const body = await request.json()
    const { tenantId: bodyTenantId, ...dashboardData } = body

    const tenantId = authResult.tenantId
    if (bodyTenantId && bodyTenantId !== tenantId) {
      return NextResponse.json({ error: "Tenant ID mismatch" }, { status: 403 })
    }

    const { data, error } = await supabase
      .from("dashboards")
      .update(dashboardData)
      .eq("id", params.id)
      .eq("tenant_id", tenantId)
      .select()
      .single()

    if (error) {
      console.error("❌ Database error:", error)
      return NextResponse.json({ error: "Database error" }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ error: "Dashboard not found" }, { status: 404 })
    }

    return NextResponse.json(data)
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

    const { error } = await supabase.from("dashboards").delete().eq("id", params.id).eq("tenant_id", tenantId)

    if (error) {
      console.error("❌ Database error:", error)
      return NextResponse.json({ error: "Database error" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Internal API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
