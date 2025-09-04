export function validateTenantId(tenantId: string): boolean {
  if (!tenantId || typeof tenantId !== "string") return false
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  return uuidRegex.test(tenantId)
}

export function validateDashboardId(dashboardId: string): boolean {
  if (!dashboardId || typeof dashboardId !== "string") return false
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidRegex.test(dashboardId)
}

export function sanitizeInput(input: string, maxLength = 255): string {
  if (!input || typeof input !== "string") return ""
  return input
    .trim()
    .slice(0, maxLength)
    .replace(/[<>'"&]/g, "") // Remove potentially dangerous characters
    .replace(/\s+/g, " ") // Normalize whitespace
}

export function validateDataType(dataType: string): boolean {
  if (!dataType || typeof dataType !== "string") return false
  // Allow alphanumeric, spaces, hyphens, underscores, parentheses, max 100 chars
  const dataTypeRegex = /^[a-zA-Z0-9\s_()-]{1,100}$/
  return dataTypeRegex.test(dataType.trim())
}

export function validateFileSize(size: number, maxSize = 10 * 1024 * 1024): boolean {
  return typeof size === "number" && size > 0 && size <= maxSize
}

export function createSecureErrorResponse(message: string, status: number, logDetails?: any) {
  // Only log detailed errors in development
  if (logDetails && process.env.NODE_ENV !== "production") {
    console.error("[v0] Debug error details:", logDetails)
  }

  // Return generic error messages in production
  const publicMessage = process.env.NODE_ENV === "production" ? getGenericErrorMessage(status) : message

  return Response.json({ error: publicMessage }, { status })
}

function getGenericErrorMessage(status: number): string {
  switch (status) {
    case 400:
      return "Invalid request"
    case 401:
      return "Unauthorized"
    case 403:
      return "Forbidden"
    case 404:
      return "Not found"
    case 429:
      return "Too many requests"
    case 500:
      return "Internal server error"
    default:
      return "An error occurred"
  }
}
