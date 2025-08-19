import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { tenantId, updates } = body

    if (!tenantId) {
      return NextResponse.json({ error: "Tenant ID is required" }, { status: 400 })
    }

    if (!Array.isArray(updates) || updates.length === 0) {
      return NextResponse.json({ error: "Updates array is required" }, { status: 400 })
    }

    const updatePromises = updates.map(({ id, sort_order }) =>
      supabase.from("data_files").update({ sort_order }).eq("id", id).eq("tenant_id", tenantId),
    )

    const results = await Promise.all(updatePromises)
    const errors = results.filter((result) => result.error)

    if (errors.length > 0) {
      console.error("❌ Database errors:", errors)
      return NextResponse.json({ error: "Failed to update data file order" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Internal API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
