import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function PATCH(request: NextRequest, { params }: { params: { key: string } }) {
  try {
    const body = await request.json()
    const { tenantId, ...settingData } = body

    if (!tenantId) {
      return NextResponse.json({ error: "Tenant ID is required" }, { status: 400 })
    }

    const { data, error } = await supabase
      .from("settings")
      .update(settingData)
      .eq("key", params.key)
      .eq("tenant_id", tenantId)
      .select()
      .single()

    if (error) {
      console.error("❌ Database error:", error)
      return NextResponse.json({ error: "Database error" }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ error: "Setting not found" }, { status: 404 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("Internal API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { key: string } }) {
  try {
    const { searchParams } = new URL(request.url)
    const tenantId = searchParams.get("tenantId")

    if (!tenantId) {
      return NextResponse.json({ error: "Tenant ID is required" }, { status: 400 })
    }

    const { error } = await supabase.from("settings").delete().eq("key", params.key).eq("tenant_id", tenantId)

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
