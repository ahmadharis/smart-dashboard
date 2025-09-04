import type { NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"
import type { User } from "@supabase/supabase-js"

export interface AuthValidationResult {
  isValid: boolean
  user?: User
  error?: string
  tenantId?: string
}

export async function validateAuthentication(request: NextRequest): Promise<AuthValidationResult> {
  try {
    const supabase = await createClient()

    // Get user from Supabase session
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return {
        isValid: false,
        error: "Authentication required. Please log in.",
      }
    }

    return {
      isValid: true,
      user,
    }
  } catch (error) {
    console.error("Authentication validation error:", error)
    return {
      isValid: false,
      error: "Authentication service unavailable",
    }
  }
}

export async function validateTenantAccess(user: User, tenantId: string): Promise<boolean> {
  try {
    const supabase = await createClient()

    // Check if user has access to the specified tenant
    const { data: userTenant, error } = await supabase
      .from("user_tenants")
      .select("tenant_id")
      .eq("user_id", user.id)
      .eq("tenant_id", tenantId)
      .single()

    if (error || !userTenant) {
      return false
    }

    return true
  } catch (error) {
    console.error("Tenant access validation error:", error)
    return false
  }
}

export async function validateAuthAndTenant(request: NextRequest, requireTenant = true): Promise<AuthValidationResult> {
  // First validate authentication
  const authResult = await validateAuthentication(request)
  if (!authResult.isValid || !authResult.user) {
    return authResult
  }

  // If tenant validation is required
  if (requireTenant) {
    const url = new URL(request.url)
    const tenantId =
      request.headers.get("X-Tenant-Id") || url.searchParams.get("tenant_id") || url.pathname.split("/")[1] // For [tenantId] routes

    console.log("[v0] Extracted tenant ID:", tenantId)
    console.log("[v0] URL pathname:", url.pathname)
    console.log("[v0] URL pathname split:", url.pathname.split("/"))

    if (!tenantId) {
      return {
        isValid: false,
        error: "Tenant ID is required. Provide X-Tenant-Id header or tenant_id parameter.",
      }
    }

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(tenantId)) {
      console.log("[v0] Tenant ID validation failed for:", tenantId)
      return {
        isValid: false,
        error: "Invalid tenant ID format",
      }
    }

    // Check if user has access to this tenant
    const hasAccess = await validateTenantAccess(authResult.user, tenantId)
    if (!hasAccess) {
      return {
        isValid: false,
        error: "Access denied to this tenant",
      }
    }

    return {
      isValid: true,
      user: authResult.user,
      tenantId,
    }
  }

  return authResult
}
