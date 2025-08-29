import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"

interface Props {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function AuthCallback({ searchParams }: Props) {
  const params = await searchParams
  const code = typeof params.code === "string" ? params.code : null

  if (code) {
    const supabase = await createClient()

    try {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code)

      if (error) {
        console.error("Email verification error:", error)
        redirect("/auth/login?error=verification-failed")
      }

      if (data.session && data.user) {
        console.log("Email verified successfully for user:", data.user.email)
        redirect("/")
      }
    } catch (err) {
      console.error("Callback error:", err)
      redirect("/auth/login?error=verification-failed")
    }
  }

  // No code or verification failed
  redirect("/auth/login")
}
