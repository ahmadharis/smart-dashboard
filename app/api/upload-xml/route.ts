import type { NextRequest } from "next/server"
import { saveDataFile } from "@/lib/data-utils"
import { createSecureResponse, sanitizeString } from "@/lib/security"
import { parseXMLToJSON } from "@/lib/xml-parser"
import { createClient } from "@supabase/supabase-js"

async function validateUploadXmlApiKey(
  request: NextRequest,
): Promise<{ isValid: boolean; tenantId?: string; error?: string; debugInfo?: any }> {
  const xApiKey = request.headers.get("x-api-key")
  const authHeader = request.headers.get("authorization")
  const providedKey = xApiKey || authHeader?.replace("Bearer ", "")

  const debugInfo = {
    hasXApiKey: !!xApiKey,
    hasAuthHeader: !!authHeader,
    providedKeyLength: providedKey?.length || 0,
    providedKeyFirst8: providedKey?.substring(0, 8) || "none",
    supabaseUrl: !!process.env.SUPABASE_URL,
    supabaseServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
  }

  if (!providedKey) {
    return { isValid: false, error: "API key is required", debugInfo }
  }

  try {
    const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

    const { data, error } = await supabase
      .from("tenants")
      .select("tenant_id, api_key")
      .eq("api_key", providedKey.trim())
      .single()

    debugInfo.dbError = error?.message || null
    debugInfo.dbDataFound = !!data
    debugInfo.queryUsedKey = providedKey.trim()

    if (error || !data) {
      const { data: allTenants } = await supabase.from("tenants").select("api_key").limit(10)

      debugInfo.allApiKeysInDb = allTenants?.map((t) => t.api_key?.substring(0, 8)) || []

      return { isValid: false, error: "Invalid API key", debugInfo }
    }

    return { isValid: true, tenantId: data.tenant_id, debugInfo }
  } catch (error) {
    debugInfo.catchError = error instanceof Error ? error.message : "Unknown error"
    return { isValid: false, error: "API key validation failed", debugInfo }
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
        debug: validation.debugInfo,
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
