import type { NextRequest } from "next/server"
import { createClient } from "@/lib/supabase"
import { createSecureResponse } from "@/lib/security"

export async function OPTIONS() {
  return createSecureResponse({})
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient()

    const { data: tenants, error } = await supabase
      .from("tenants")
      .select("tenant_id, name")
      .order("name", { ascending: true })

    if (error) {
      console.error("Database error:", error)
      return createSecureResponse({ error: "Failed to fetch tenants" }, 500)
    }

    return createSecureResponse(tenants)
  } catch (error) {
    console.error("Error fetching tenants:", error)
    return createSecureResponse({ error: "Internal server error" }, 500)
  }
}
