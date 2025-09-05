import { type NextRequest, NextResponse } from "next/server"
import { validateAuthAndTenant } from "@/lib/auth-middleware"
import { createServiceClient } from "@/lib/supabase"

const supabase = createServiceClient()

export async function GET(request: NextRequest) {
  try {
    const authResult = await validateAuthAndTenant(request, true)
    if (!authResult.isValid || !authResult.tenantId) {
      return NextResponse.json({ error: authResult.error || "Authentication required" }, { status: 401 })
    }

    const tenantId = authResult.tenantId

    const { data: dashboards, error } = await supabase
      .from("dashboards")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("sort_order", { ascending: true })

    if (error) {
      console.error("❌ Database error:", error)
      return NextResponse.json({ error: "Database error", details: error.message }, { status: 500 })
    }

    return NextResponse.json(dashboards || [])
  } catch (error) {
    console.error("💥 Internal API error:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
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
      .insert([{ ...dashboardData, tenant_id: tenantId }])
      .select()
      .single()

    if (error) {
      console.error("❌ Database error:", error)
      return NextResponse.json({ error: "Database error", details: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("Internal API error:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
