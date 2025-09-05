import type { NextRequest } from "next/server"
import { saveDataFile } from "@/lib/data-utils"
import { validateSecurity, createSecurityErrorResponse, createSecureResponse, sanitizeString } from "@/lib/security"
import { parseXMLToJSON } from "@/lib/xml-parser"

export async function OPTIONS() {
  return createSecureResponse({})
}

export async function POST(request: NextRequest) {
  const validation = await validateSecurity(request, true)

  if (!validation.isValid) {
    return createSecurityErrorResponse(validation.error!)
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
