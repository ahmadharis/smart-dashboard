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
      const supabase = createClient()
      const code = searchParams.get("code")

      console.log("[v0] Callback started with code:", code ? "present" : "missing")

      if (code) {
        try {
          const { data, error } = await supabase.auth.exchangeCodeForSession(code)

          console.log("[v0] Exchange result:", { hasSession: !!data.session, error: error?.message })

          if (error) {
            console.error("[v0] Email verification error:", error)
            setError("Email verification failed. Please try again.")
            setTimeout(() => router.push("/auth/login?error=verification-failed"), 2000)
            return
          }

          if (data.session) {
            console.log("[v0] Email verified successfully, redirecting...")
            window.location.href = "/"
            return
          }
        } catch (err) {
          console.error("[v0] Callback error:", err)
          setError("Verification failed. Please try again.")
          setTimeout(() => router.push("/auth/login"), 2000)
          return
        }
      }

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
          window.location.href = "/"
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

    const timeoutId = setTimeout(() => {
      console.log("[v0] Callback timeout, redirecting to login")
      setError("Verification is taking too long. Redirecting...")
      router.push("/auth/login")
    }, 10000) // 10 second timeout

    handleAuthCallback().finally(() => {
      clearTimeout(timeoutId)
    })

    return () => clearTimeout(timeoutId)
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
