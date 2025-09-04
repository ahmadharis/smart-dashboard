import type { NextRequest } from "next/server"
import { validateAuthentication } from "@/lib/auth-middleware"
import { createClient } from "@/lib/supabase/server"
import { createSecureResponse } from "@/lib/security"

export async function OPTIONS() {
  return createSecureResponse({})
}

export async function GET(request: NextRequest) {
  try {
    const authResult = await validateAuthentication(request)
    if (!authResult.isValid || !authResult.user) {
      return createSecureResponse({ error: authResult.error || "Authentication required" }, 401)
    }

    const user = authResult.user
    const supabase = await createClient()

    // Query user_tenants to get accessible tenants
    const { data: userTenants, error: userTenantsError } = await supabase
      .from("user_tenants")
      .select("tenant_id")
      .eq("user_id", user.id)

    if (userTenantsError) {
      console.error("User tenants query error:", userTenantsError)
      return createSecureResponse({ error: "Failed to fetch user permissions" }, 500)
    }

    if (!userTenants || userTenants.length === 0) {
      return createSecureResponse([])
    }

    const tenantIds = userTenants.map((ut) => ut.tenant_id)

    // Get tenant details for accessible tenants
    const { data: tenants, error: tenantsError } = await supabase
      .from("tenants")
      .select("tenant_id, name")
      .in("tenant_id", tenantIds)
      .order("name", { ascending: true })

    if (tenantsError) {
      console.error("Tenants query error:", tenantsError)
      return createSecureResponse({ error: "Failed to fetch tenants" }, 500)
    }

    return createSecureResponse(tenants || [])
  } catch (error) {
    console.error("Error fetching tenants:", error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    if (errorMessage.includes("rate limit") || errorMessage.includes("Too Many Requests")) {
      return createSecureResponse({ error: "Database is temporarily busy. Please try again in a moment." }, 429)
    }
    return createSecureResponse({ error: "Internal server error" }, 500)
  }
}
