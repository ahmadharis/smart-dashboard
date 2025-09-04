import type { NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createSecureResponse } from "@/lib/security"

export async function OPTIONS() {
  return createSecureResponse({})
}

export async function GET(request: NextRequest) {
  try {
    console.log("[v0] Starting tenant fetch")
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    console.log("[v0] Auth check - user:", user?.id, "error:", authError)

    if (authError || !user) {
      return createSecureResponse({ error: "Unauthorized" }, 401)
    }

    console.log("[v0] Querying user_tenants for user:", user.id)
    const { data: userTenants, error: userTenantsError } = await supabase
      .from("user_tenants")
      .select("tenant_id")
      .eq("user_id", user.id)

    console.log("[v0] User tenants result:", userTenants, "error:", userTenantsError)

    if (userTenantsError) {
      console.error("User tenants query error:", userTenantsError)
      return createSecureResponse({ error: "Failed to fetch user permissions" }, 500)
    }

    if (!userTenants || userTenants.length === 0) {
      console.log("[v0] No tenants found for user, returning empty array")
      return createSecureResponse([])
    }

    console.log("[v0] Mapping tenant IDs from:", userTenants)
    const tenantIds = userTenants.map((ut) => {
      console.log("[v0] Processing user tenant:", ut)
      return ut.tenant_id
    })
    console.log("[v0] Extracted tenant IDs:", tenantIds)

    console.log("[v0] Querying tenants table with IDs:", tenantIds)
    const { data: tenants, error: tenantsError } = await supabase
      .from("tenants")
      .select("tenant_id, name")
      .in("tenant_id", tenantIds)
      .order("name", { ascending: true })

    console.log("[v0] Tenants result:", tenants, "error:", tenantsError)

    if (tenantsError) {
      console.error("Tenants query error:", tenantsError)
      return createSecureResponse({ error: "Failed to fetch tenants" }, 500)
    }

    console.log("[v0] Returning tenants:", tenants || [])
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
