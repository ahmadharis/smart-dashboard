interface ApiClientOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE"
  headers?: Record<string, string>
  body?: any
  tenantId?: string
}

async function safeJsonParse(response: Response): Promise<any> {
  try {
    const text = await response.text()
    if (!text) return {}

    // Check if response looks like JSON
    if (text.trim().startsWith("{") || text.trim().startsWith("[")) {
      return JSON.parse(text)
    } else {
      // Return HTML/text content as error message
      return {
        error: text.includes("Too Many") ? "Rate limit exceeded. Please try again later." : "Server error occurred",
        rawResponse: text.substring(0, 100), // First 100 chars for debugging
      }
    }
  } catch (error) {
    return {
      error: "Invalid response format",
      parseError: error instanceof Error ? error.message : "Unknown parsing error",
    }
  }
}

export class ApiClient {
  private static getHeaders(options: ApiClientOptions = {}): Record<string, string> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...options.headers,
    }

    return headers
  }

  static async request(url: string, options: ApiClientOptions = {}): Promise<Response> {
    const { method = "GET", body, tenantId, ...restOptions } = options

    let finalUrl = url
    let finalBody = body

    if (tenantId) {
      if (method === "GET" || method === "DELETE") {
        const separator = url.includes("?") ? "&" : "?"
        finalUrl = `${url}${separator}tenantId=${encodeURIComponent(tenantId)}`
      } else if (body) {
        if (body instanceof FormData) {
          body.append("tenantId", tenantId)
          finalBody = body
        } else if (typeof body === "object") {
          finalBody = { ...body, tenantId }
        }
      } else {
        finalBody = { tenantId }
      }
    }

    const fetchOptions: RequestInit = {
      method,
      headers: this.getHeaders(options),
      ...restOptions,
    }

    if (finalBody) {
      if (finalBody instanceof FormData) {
        delete fetchOptions.headers!["Content-Type"]
        fetchOptions.body = finalBody
      } else if (typeof finalBody === "object") {
        fetchOptions.body = JSON.stringify(finalBody)
      } else {
        fetchOptions.body = finalBody
      }
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout

    try {
      const response = await fetch(finalUrl, {
        ...fetchOptions,
        signal: controller.signal,
      })
      clearTimeout(timeoutId)

      const enhancedResponse = new Proxy(response, {
        get(target, prop) {
          if (prop === "json") {
            return () => safeJsonParse(target.clone())
          }
          return target[prop as keyof Response]
        },
      })

      return enhancedResponse
    } catch (error) {
      clearTimeout(timeoutId)
      if (error instanceof Error && error.name === "AbortError") {
        throw new Error("Request timeout - please try again")
      }
      throw error
    }
  }

  static async get(url: string, options: Omit<ApiClientOptions, "method" | "body"> = {}): Promise<Response> {
    return this.request(url, { ...options, method: "GET" })
  }

  static async post(
    url: string,
    body?: any,
    options: Omit<ApiClientOptions, "method" | "body"> = {},
  ): Promise<Response> {
    return this.request(url, { ...options, method: "POST", body })
  }

  static async put(
    url: string,
    body?: any,
    options: Omit<ApiClientOptions, "method" | "body"> = {},
  ): Promise<Response> {
    return this.request(url, { ...options, method: "PUT", body })
  }

  static async patch(
    url: string,
    body?: any,
    options: Omit<ApiClientOptions, "method" | "body"> = {},
  ): Promise<Response> {
    return this.request(url, { ...options, method: "PATCH", body })
  }

  static async delete(url: string, options: Omit<ApiClientOptions, "method" | "body"> = {}): Promise<Response> {
    return this.request(url, { ...options, method: "DELETE" })
  }
}
