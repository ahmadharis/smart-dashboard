import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  const next = searchParams.get("next") ?? "/"

  console.log("[v0] Auth callback - Processing verification code")

  if (code) {
    const supabase = await createClient()

    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data.session) {
      console.log("[v0] Auth callback - Session created successfully")

      const {
        data: { user },
      } = await supabase.auth.getUser()
      console.log("[v0] Auth callback - User verified:", user?.email)

      const forwardedHost = request.headers.get("x-forwarded-host")
      const isLocalEnv = process.env.NODE_ENV === "development"

      if (isLocalEnv) {
        return NextResponse.redirect(`${origin}/`)
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}/`)
      } else {
        return NextResponse.redirect(`${origin}/`)
      }
    } else {
      console.log("[v0] Auth callback - Session creation failed:", error?.message)
    }
  }

  console.log("[v0] Auth callback - Redirecting to login with error")
  return NextResponse.redirect(`${origin}/auth/login?message=Could not authenticate user`)
}
