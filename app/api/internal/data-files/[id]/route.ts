import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json()
    const { tenantId, ...fileData } = body

    if (!tenantId) {
      return NextResponse.json({ error: "Tenant ID is required" }, { status: 400 })
    }

    const { data, error } = await supabase
      .from("data_files")
      .update(fileData)
      .eq("id", params.id)
      .eq("tenant_id", tenantId)
      .select()
      .single()

    if (error) {
      console.error("❌ Database error:", error)
      return NextResponse.json({ error: "Database error" }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ error: "Data file not found" }, { status: 404 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("Internal API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json()
    const { tenantId, ...updateData } = body

    if (!tenantId) {
      return NextResponse.json({ error: "Tenant ID is required" }, { status: 400 })
    }

    const { data, error } = await supabase
      .from("data_files")
      .update(updateData)
      .eq("id", params.id)
      .eq("tenant_id", tenantId)
      .select()
      .single()

    if (error) {
      console.error("❌ Database error:", error)
      return NextResponse.json({ error: "Database error" }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ error: "Data file not found" }, { status: 404 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("Internal API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { searchParams } = new URL(request.url)
    const tenantId = searchParams.get("tenantId")

    if (!tenantId) {
      return NextResponse.json({ error: "Tenant ID is required" }, { status: 400 })
    }

    const { error } = await supabase.from("data_files").delete().eq("id", params.id).eq("tenant_id", tenantId)

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
