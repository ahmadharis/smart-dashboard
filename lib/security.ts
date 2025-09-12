import { type NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "./supabase"

export interface SecurityValidationResult {
  isValid: boolean
  error?: string
  tenantId?: string
}

export async function validateApiKey(
  request: NextRequest,
): Promise<{ isValid: boolean; tenantId?: string; error?: string }> {
  const xApiKey = request.headers.get("x-api-key")
  const authHeader = request.headers.get("authorization")
  const providedKey = xApiKey || authHeader?.replace("Bearer ", "")

  if (!providedKey) {
    return {
      isValid: false,
      error: "API key is required. Provide x-api-key header or Authorization: Bearer token.",
    }
  }

  try {
    const supabase = createServiceClient()

    const { data, error } = await supabase
      .from("tenants")
      .select("tenant_id, api_key")
      .eq("api_key", providedKey.trim())
      .single()

    if (error || !data) {
      return {
        isValid: false,
        error: "Invalid API key",
      }
    }

    if (providedKey.trim() !== data.api_key) {
      return {
        isValid: false,
        error: "Invalid API key",
      }
    }

    return {
      isValid: true,
      tenantId: data.tenant_id,
    }
  } catch (error) {
    return {
      isValid: false,
      error: "API key validation failed",
    }
  }
}

// Validate tenant exists and is accessible
export async function validateTenant(tenantId: string): Promise<boolean> {
  if (!tenantId || !isValidUUID(tenantId)) {
    return false
  }

  try {
    const supabase = createServiceClient()
    const { data, error } = await supabase.from("tenants").select("tenant_id").eq("tenant_id", tenantId).single()

    return !error && !!data
  } catch (error) {
    console.error("Tenant validation error:", error)
    return false
  }
}

export async function validateSecurity(request: NextRequest, requireTenant = true): Promise<SecurityValidationResult> {
  // Validate API key and get associated tenant
  const apiKeyResult = await validateApiKey(request)

  if (!apiKeyResult.isValid) {
    return {
      isValid: false,
      error: apiKeyResult.error || "Invalid API key",
    }
  }

  // Handle tenant validation
  if (requireTenant) {
    const url = new URL(request.url)
    const requestedTenantId =
      request.headers.get("X-Tenant-Id") || url.searchParams.get("tenant_id") || url.pathname.split("/")[1] // For [tenantId] routes

    // If no tenant ID is provided in request, use the one from API key
    const tenantId = requestedTenantId || apiKeyResult.tenantId

    if (!tenantId) {
      return {
        isValid: false,
        error: "Tenant ID is required. Provide X-Tenant-Id header or tenant_id parameter.",
      }
    }

    // Ensure the requested tenant matches the API key's tenant
    if (requestedTenantId && requestedTenantId !== apiKeyResult.tenantId) {
      return {
        isValid: false,
        error: "API key does not have access to the requested tenant",
      }
    }

    const isTenantValid = await validateTenant(tenantId)

    if (!isTenantValid) {
      return {
        isValid: false,
        error: "Invalid or inaccessible tenant",
      }
    }

    return {
      isValid: true,
      tenantId,
    }
  }

  return {
    isValid: true,
    tenantId: apiKeyResult.tenantId,
  }
}

// Input validation utilities
export function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidRegex.test(uuid)
}

export function sanitizeString(input: string, maxLength = 255): string {
  if (!input || typeof input !== "string") {
    return ""
  }

  return input
    .trim()
    .replace(/[<>'"&]/g, "")
    .slice(0, maxLength)
}

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

// Security error responses
export function createSecurityErrorResponse(message: string, status = 401): NextResponse {
  const sanitizedMessage = status >= 500 ? "Internal server error" : message
  const response = NextResponse.json({ error: sanitizedMessage }, { status })
  return setCorsHeaders(response)
}

// Success response with CORS
export function createSecureResponse(data: any, status = 200): NextResponse {
  const response = NextResponse.json(data, { status })
  return setCorsHeaders(response)
}

export function setCorsHeaders(response: NextResponse): NextResponse {
  response.headers.set("Access-Control-Allow-Origin", "*")
  response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
  response.headers.set(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, x-api-key, X-Tenant-Id, X-Dashboard-Id, X-Data-Type",
  )
  response.headers.set("Access-Control-Max-Age", "86400")

  return response
}

export async function validateDashboardOwnership(
  dashboardId: string,
  tenantId: string,
): Promise<{ isValid: boolean; error?: string }> {
  if (!isValidUUID(dashboardId)) {
    return { isValid: false, error: "Invalid dashboard ID format" }
  }

  try {
    const supabase = createServiceClient()

    const { data, error } = await supabase
      .from("dashboards")
      .select("id")
      .eq("id", dashboardId)
      .eq("tenant_id", tenantId)
      .single()

    if (error || !data) {
      return { isValid: false, error: "Dashboard does not exist" }
    }

    return { isValid: true }
  } catch (error) {
    console.error("Dashboard validation error:", error)
    return { isValid: false, error: "Dashboard validation failed" }
  }
}
