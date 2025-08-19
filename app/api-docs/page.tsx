"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function ApiDocsRedirect() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to tenant selector
    router.push("/")
  }, [router])

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  )
}
