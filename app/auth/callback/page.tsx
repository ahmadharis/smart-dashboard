"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

export default function AuthCallback() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const handleAuthCallback = async () => {
      console.log("[v0] Creating Supabase client...")
      try {
        const supabase = createClient()
        console.log("[v0] Supabase client created successfully")
      } catch (clientError) {
        console.error("[v0] Failed to create Supabase client:", clientError)
        setError("Configuration error. Please contact support.")
        return
      }

      const supabase = createClient()
      const code = searchParams.get("code")

      console.log("[v0] Callback started with code:", code ? "present" : "missing")
      if (code) {
        console.log("[v0] Code length:", code.length)
        console.log("[v0] Code preview:", code.substring(0, 20) + "...")
      }

      if (code) {
        try {
          console.log("[v0] Starting exchangeCodeForSession...")
          const startTime = Date.now()
          const { data, error } = await supabase.auth.exchangeCodeForSession(code)
          const endTime = Date.now()
          console.log("[v0] Exchange completed in", endTime - startTime, "ms")

          console.log("[v0] Exchange result:", {
            hasSession: !!data.session,
            hasUser: !!data.user,
            error: error?.message,
          })

          if (error) {
            console.error("[v0] Email verification error:", error)
            setError("Email verification failed. Please try again.")
            setTimeout(() => router.push("/auth/login?error=verification-failed"), 3000)
            return
          }

          if (data.session && data.user) {
            console.log("[v0] Email verified successfully, user:", data.user.email)
            router.push("/")
            return
          }
        } catch (err) {
          console.error("[v0] Callback error:", err)
          setError("Verification failed. Please try again.")
          setTimeout(() => router.push("/auth/login"), 3000)
          return
        }
      }

      console.log("[v0] No code found, checking for existing session...")
      try {
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession()

        if (sessionError) {
          console.error("[v0] Session error:", sessionError)
          setError("Authentication error. Redirecting to login...")
          setTimeout(() => router.push("/auth/login"), 2000)
          return
        }

        if (sessionData.session) {
          console.log("[v0] Session found, redirecting to dashboard")
          router.push("/")
        } else {
          console.log("[v0] No session, redirecting to login")
          setTimeout(() => router.push("/auth/login"), 1000)
        }
      } catch (err) {
        console.error("[v0] Session check error:", err)
        setError("Authentication error. Redirecting to login...")
        setTimeout(() => router.push("/auth/login"), 2000)
      }
    }

    handleAuthCallback()
  }, [router, searchParams])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
        <p>{error || "Verifying your account..."}</p>
        {error && <p className="text-sm text-muted-foreground mt-2">You will be redirected shortly.</p>}
      </div>
    </div>
  )
}
