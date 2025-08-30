import type { NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createSecureResponse } from "@/lib/security"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get the current user from the session
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return createSecureResponse({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { userId } = body

    // Verify the requested userId matches the authenticated user
    if (userId !== user.id) {
      return createSecureResponse({ error: "Forbidden" }, { status: 403 })
    }

    // Query user_tenants table to get tenant access
    const { data: userTenants, error: queryError } = await supabase
      .from("user_tenants")
      .select("tenant_id")
      .eq("user_id", userId)

    if (queryError) {
      console.error("Error querying user_tenants:", queryError)
      return createSecureResponse({ error: "Database error" }, { status: 500 })
    }

    // Convert array of tenant_ids to access object
    const tenantAccess: { [tenantId: string]: boolean } = {}
    userTenants?.forEach((row) => {
      tenantAccess[row.tenant_id] = true
    })

    return createSecureResponse({
      tenantAccess,
      message: `Found access to ${userTenants?.length || 0} tenants`,
    })
  } catch (error) {
    console.error("Tenant permissions API error:", error)
    return createSecureResponse({ error: "Internal server error" }, { status: 500 })
  }
}
