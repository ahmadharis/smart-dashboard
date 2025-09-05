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

  console.log("[v0] API Key validation - x-api-key header:", xApiKey)
  console.log("[v0] API Key validation - auth header:", authHeader)
  console.log("[v0] API Key validation - provided key:", providedKey ? `${providedKey.substring(0, 8)}...` : "null")
  console.log("[v0] API Key validation - provided key length:", providedKey?.length)
  console.log("[v0] API Key validation - provided key full (for debug):", providedKey)

  if (!providedKey) {
    console.log("[v0] API Key validation - No API key provided")
    return {
      isValid: false,
      error: "API key is required. Provide x-api-key header or Authorization: Bearer token.",
    }
  }

  try {
    const supabase = createServiceClient()
    console.log("[v0] API Key validation - Created service client")

    const { data: connectionTest, error: connectionError } = await supabase.from("tenants").select("count").limit(1)
    console.log("[v0] API Key validation - Connection test:", { connectionTest, connectionError })

    if (connectionError) {
      console.log("[v0] API Key validation - Database connection failed:", connectionError)
      return {
        isValid: false,
        error: "Database connection failed",
      }
    }

    console.log("[v0] API Key validation - Querying database for key:", providedKey.substring(0, 8) + "...")

    const trimmedKey = providedKey.trim()
    console.log("[v0] API Key validation - Trimmed key:", trimmedKey)

    const { data: allKeys, error: allKeysError } = await supabase.from("tenants").select("tenant_id, api_key")
    console.log(
      "[v0] API Key validation - All keys in database:",
      allKeys?.map((k) => ({ tenant_id: k.tenant_id, api_key: k.api_key?.substring(0, 8) + "..." })),
    )

    const { data, error } = await supabase.from("tenants").select("tenant_id").eq("api_key", trimmedKey).single()

    console.log("[v0] API Key validation - Database query result:", { data, error })

    if (error || !data) {
      console.log("[v0] API Key validation - Exact match failed, trying case-insensitive match")
      const { data: caseInsensitiveData, error: caseInsensitiveError } = await supabase
        .from("tenants")
        .select("tenant_id")
        .ilike("api_key", trimmedKey)
        .single()

      console.log("[v0] API Key validation - Case-insensitive query result:", {
        caseInsensitiveData,
        caseInsensitiveError,
      })

      if (caseInsensitiveError || !caseInsensitiveData) {
        console.log("[v0] API Key validation - Failed:", error?.message || "No data returned")
        return {
          isValid: false,
          error: "Invalid API key",
        }
      }

      console.log("[v0] API Key validation - Success (case-insensitive) for tenant:", caseInsensitiveData.tenant_id)
      return {
        isValid: true,
        tenantId: caseInsensitiveData.tenant_id,
      }
    }

    console.log("[v0] API Key validation - Success for tenant:", data.tenant_id)
    return {
      isValid: true,
      tenantId: data.tenant_id,
    }
  } catch (error) {
    console.error("[v0] API Key validation - Exception:", error)
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
  console.log("[v0] Security validation starting for:", request.url)

  // Validate API key and get associated tenant
  const apiKeyResult = await validateApiKey(request)
  console.log("[v0] API key validation result:", {
    isValid: apiKeyResult.isValid,
    error: apiKeyResult.error,
    tenantId: apiKeyResult.tenantId,
  })

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
      console.log("[v0] Security validation - No tenant ID provided")
      return {
        isValid: false,
        error: "Tenant ID is required. Provide X-Tenant-Id header or tenant_id parameter.",
      }
    }

    // Ensure the requested tenant matches the API key's tenant
    if (requestedTenantId && requestedTenantId !== apiKeyResult.tenantId) {
      console.log("[v0] Security validation - API key does not match requested tenant")
      return {
        isValid: false,
        error: "API key does not have access to the requested tenant",
      }
    }

    const isTenantValid = await validateTenant(tenantId)
    console.log("[v0] Security validation - Tenant validation result:", isTenantValid)

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
  return input.trim().slice(0, maxLength)
}

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

// CORS headers for internet-facing application
export function setCorsHeaders(response: NextResponse): NextResponse {
  response.headers.set("Access-Control-Allow-Origin", "*")
  response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
  response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization, x-api-key")
  response.headers.set("Access-Control-Max-Age", "86400")
  return response
}

// Security error responses
export function createSecurityErrorResponse(message: string, status = 401): NextResponse {
  const response = NextResponse.json({ error: message }, { status })
  return setCorsHeaders(response)
}

// Success response with CORS
export function createSecureResponse(data: any, status = 200): NextResponse {
  const response = NextResponse.json(data, { status })
  return setCorsHeaders(response)
}
