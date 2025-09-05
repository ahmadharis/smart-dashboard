import type { NextRequest } from "next/server"
import { saveDataFile } from "@/lib/data-utils"
import { createSecureResponse, sanitizeString } from "@/lib/security"
import { parseXMLToJSON } from "@/lib/xml-parser"
import { createClient } from "@supabase/supabase-js"

async function validateUploadXmlApiKey(
  request: NextRequest,
): Promise<{ isValid: boolean; tenantId?: string; error?: string }> {
  const xApiKey = request.headers.get("x-api-key")
  const authHeader = request.headers.get("authorization")
  const providedKey = xApiKey || authHeader?.replace("Bearer ", "")
  const requestedTenantId = request.headers.get("X-Tenant-Id")

  if (!providedKey) {
    return { isValid: false, error: "API key is required" }
  }

  if (!requestedTenantId) {
    return { isValid: false, error: "X-Tenant-Id header is required" }
  }

  try {
    const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

    const { data, error } = await supabase
      .from("tenants")
      .select("tenant_id, api_key")
      .eq("tenant_id", requestedTenantId)
      .eq("api_key", providedKey.trim())
      .maybeSingle()

    if (error || !data) {
      return { isValid: false, error: "Invalid API key" }
    }

    return { isValid: true, tenantId: data.tenant_id }
  } catch (error) {
    return { isValid: false, error: "API key validation failed" }
  }
}

export async function OPTIONS() {
  return createSecureResponse({})
}

export async function POST(request: NextRequest) {
  const validation = await validateUploadXmlApiKey(request)

  if (!validation.isValid) {
    return createSecureResponse(
      {
        error: validation.error,
      },
      401,
    )
  }

  try {
    const tenantId = validation.tenantId!

    // Get required parameters
    const type = request.headers.get("X-Data-Type")
    const dashboardTitle = request.headers.get("X-Dashboard-Title")
    const dashboardId = request.headers.get("X-Dashboard-Id")

    if (!type) {
      return createSecureResponse({ error: "Missing X-Data-Type header" }, 400)
    }

    if (!dashboardId && !dashboardTitle) {
      return createSecureResponse(
        {
          error:
            "Either X-Dashboard-Id (for existing dashboard) or X-Dashboard-Title (for new dashboard) header is required",
        },
        400,
      )
    }

    if (dashboardId && dashboardTitle) {
      return createSecureResponse(
        {
          error: "Provide either X-Dashboard-Id OR X-Dashboard-Title, not both",
        },
        400,
      )
    }

    // Parse XML from request body
    const xmlData = await request.text()

    if (!xmlData) {
      return createSecureResponse({ error: "No XML data provided" }, 400)
    }

    const { data: transformedData, fieldOrder, message } = parseXMLToJSON(xmlData, type)

    const sanitizedType = sanitizeString(type, 50)
    const fileName = `${sanitizedType}.json`

    const saved = await saveDataFile(
      fileName,
      sanitizedType,
      transformedData,
      tenantId,
      dashboardId,
      dashboardTitle,
      fieldOrder,
    )

    if (!saved) {
      return createSecureResponse({ error: "Failed to save data file" }, 500)
    }

    return createSecureResponse({
      success: true,
      message: message,
      recordCount: transformedData.length,
      fileName: fileName,
      dashboardId: saved.dashboard_id,
    })
  } catch (error) {
    console.error("API Error:", error)
    return createSecureResponse({ error: error instanceof Error ? error.message : "Internal server error" }, 500)
  }
}
