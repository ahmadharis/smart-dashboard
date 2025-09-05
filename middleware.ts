import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { updateSession } from "@/lib/supabase/middleware"

const rateLimitMap = new Map<string, { count: number; resetTime: number }>()

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let result = 0
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return result === 0
}

function checkRateLimit(ip: string, limit = 100, windowMs = 60000): boolean {
  const now = Date.now()
  const key = ip
  const record = rateLimitMap.get(key)

  if (!record || now > record.resetTime) {
    rateLimitMap.set(key, { count: 1, resetTime: now + windowMs })
    return true
  }

  if (record.count >= limit) {
    return false
  }

  record.count++
  return true
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  const supabaseResponse = await updateSession(request)

  // If Supabase middleware returned a redirect, use it
  if (supabaseResponse.status === 307 || supabaseResponse.status === 302) {
    return supabaseResponse
  }

  // Apply security headers to the Supabase response
  supabaseResponse.headers.set("X-Frame-Options", "DENY")
  supabaseResponse.headers.set("X-Content-Type-Options", "nosniff")
  supabaseResponse.headers.set("Referrer-Policy", "strict-origin-when-cross-origin")
  supabaseResponse.headers.set("X-XSS-Protection", "1; mode=block")
  supabaseResponse.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
  supabaseResponse.headers.set(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self' https://*.supabase.co; object-src 'none'; base-uri 'self'; form-action 'self'",
  )
  supabaseResponse.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=()")

  if (pathname.startsWith("/api/internal/")) {
    const clientIP = request.ip || request.headers.get("x-forwarded-for") || "unknown"
    if (!checkRateLimit(clientIP, 50, 60000)) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 })
    }

    const origin = request.headers.get("origin")
    const referer = request.headers.get("referer")
    const host = request.headers.get("host")

    const allowedOrigins = [
      `https://${host}`,
      `http://${host}`,
      ...(process.env.NODE_ENV === "development" ? ["http://localhost:3000", "https://localhost:3000"] : []),
      ...(process.env.VERCEL_URL ? [`https://${process.env.VERCEL_URL}`] : []),
    ]

    const requestOrigin = origin || (referer ? new URL(referer).origin : null)
    const isSameOrigin = requestOrigin && allowedOrigins.some((allowed) => requestOrigin === allowed)

    if (!isSameOrigin) {
      const apiKey = request.headers.get("x-api-key") || request.nextUrl.searchParams.get("api_key")
      const expectedKey = process.env.API_SECRET_KEY

      if (!expectedKey) {
        console.error("[v0] API_SECRET_KEY not found in environment variables")
        return NextResponse.json({ error: "Server configuration error" }, { status: 500 })
      }

      if (!apiKey || !timingSafeEqual(apiKey, expectedKey)) {
        console.error("[v0] Unauthorized external request:", {
          hasApiKey: !!apiKey,
          pathname,
          origin: request.headers.get("origin"),
        })
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      }
    }

    const allowedMethods = ["GET", "POST", "PUT", "PATCH", "DELETE"]
    if (!allowedMethods.includes(request.method)) {
      return NextResponse.json({ error: "Method not allowed" }, { status: 405 })
    }

    return supabaseResponse
  }

  if (
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/favicon.ico") ||
    pathname === "/" ||
    pathname.startsWith("/auth/") ||
    pathname.startsWith("/shared/")
  ) {
    return supabaseResponse
  }

  const tenantIdMatch = pathname.match(/^\/([^/]+)/)

  if (!tenantIdMatch) {
    return NextResponse.redirect(new URL("/", request.url))
  }

  const tenantId = tenantIdMatch[1]
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

  if (!uuidRegex.test(tenantId)) {
    return NextResponse.redirect(new URL("/", request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - images - .svg, .png, .jpg, .jpeg, .gif, .webp
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
