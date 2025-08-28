import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const tenantId = searchParams.get("tenantId")

    if (!tenantId) {
      return NextResponse.json({ error: "Tenant ID is required" }, { status: 400 })
    }

    const { data: dashboards, error } = await supabase
      .from("dashboards")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("sort_order", { ascending: true })

    if (error) {
      console.error("❌ Database error:", error)
      console.log("[v0] Debug error details:", JSON.stringify(error, null, 2))
      return NextResponse.json({ error: "Database error", details: error.message }, { status: 500 })
    }

    return NextResponse.json(dashboards || [])
  } catch (error) {
    console.error("💥 Internal API error:", error)
    console.log("[v0] Debug error details:", error instanceof Error ? error.message : String(error))
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
    const body = await request.json()
    const { tenantId, ...dashboardData } = body

    if (!tenantId) {
      return NextResponse.json({ error: "Tenant ID is required" }, { status: 400 })
    }

    const { data, error } = await supabase
      .from("dashboards")
      .insert([{ ...dashboardData, tenant_id: tenantId }])
      .select()
      .single()

    if (error) {
      console.error("❌ Database error:", error)
      console.log("[v0] Debug error details:", JSON.stringify(error, null, 2))
      return NextResponse.json({ error: "Database error", details: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("Internal API error:", error)
    console.log("[v0] Debug error details:", error instanceof Error ? error.message : String(error))
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
