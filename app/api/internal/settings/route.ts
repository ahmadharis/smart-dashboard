import { type NextRequest, NextResponse } from "next/server"
import { validateAuthAndTenant } from "@/lib/auth-middleware"
import { createServiceClient } from "@/lib/supabase"

export async function GET(request: NextRequest) {
  try {
    const authResult = await validateAuthAndTenant(request, true)
    if (!authResult.isValid || !authResult.tenantId) {
      return NextResponse.json({ error: authResult.error || "Authentication required" }, { status: 401 })
    }

    const tenantId = authResult.tenantId
    const supabase = createServiceClient()

    const { data: settings, error } = await supabase
      .from("settings")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("key", { ascending: true })

    if (error) {
      console.error("❌ Database error:", error)
      return NextResponse.json({ error: "Database error" }, { status: 500 })
    }

    return NextResponse.json(settings || [])
  } catch (error) {
    console.error("Internal settings API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await validateAuthAndTenant(request, true)
    if (!authResult.isValid || !authResult.tenantId) {
      return NextResponse.json({ error: authResult.error || "Authentication required" }, { status: 401 })
    }

    const body = await request.json()
    const { tenantId: bodyTenantId, ...settingData } = body

    const tenantId = authResult.tenantId
    if (bodyTenantId && bodyTenantId !== tenantId) {
      return NextResponse.json({ error: "Tenant ID mismatch" }, { status: 403 })
    }

    const supabase = createServiceClient()

    const { data, error } = await supabase
      .from("settings")
      .insert([{ ...settingData, tenant_id: tenantId }])
      .select()
      .single()

    if (error) {
      console.error("❌ Database error:", error)
      return NextResponse.json({ error: "Database error" }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("Internal API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
