"use client"

import { useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

export default function AuthCallback() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const handleAuthCallback = async () => {
      const supabase = createClient()

      const code = searchParams.get("code")

      if (code) {
        // Exchange the code for a session (email verification)
        const { data, error } = await supabase.auth.exchangeCodeForSession(code)

        if (error) {
          console.error("Email verification error:", error)
          router.push("/auth/login?error=verification-failed")
          return
        }

        if (data.session) {
          // Email verified successfully, redirect to dashboard
          router.push("/")
          return
        }
      }

      const { data: sessionData, error: sessionError } = await supabase.auth.getSession()

      if (sessionError) {
        console.error("Auth callback error:", sessionError)
        router.push("/auth/login?error=callback-error")
        return
      }

      if (sessionData.session) {
        // User is authenticated, redirect to dashboard
        router.push("/")
      } else {
        // No session, redirect to login
        router.push("/auth/login")
      }
    }

    handleAuthCallback()
  }, [router, searchParams])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
        <p>Verifying your account...</p>
      </div>
    </div>
  )
}
