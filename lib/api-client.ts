interface ApiClientOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE"
  headers?: Record<string, string>
  body?: any
  tenantId?: string
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

    return await fetch(finalUrl, fetchOptions)
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
