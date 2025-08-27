"use client"

import type React from "react"

import { useAuth } from "./auth-provider"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Loader2 } from "lucide-react"

interface ProtectedRouteProps {
  children: React.ReactNode
  tenantId: string
}

export function ProtectedRoute({ children, tenantId }: ProtectedRouteProps) {
  const { user, isLoading, checkTenantAccess } = useAuth()
  const router = useRouter()
  const [hasRedirected, setHasRedirected] = useState(false)

  useEffect(() => {
    if (isLoading || hasRedirected) return

    if (!user) {
      console.log("[v0] No user found, redirecting to login")
      setHasRedirected(true)
      router.push("/auth/login")
      return
    }

    const hasAccess = checkTenantAccess(tenantId)
    if (!hasAccess) {
      console.log("[v0] No tenant access, redirecting to home with error")
      setHasRedirected(true)
      router.push(`/?error=access_denied&tenant=${tenantId}`)
      return
    }

    console.log("[v0] Access granted for tenant:", tenantId)
  }, [user, isLoading, tenantId, router, hasRedirected])

  useEffect(() => {
    setHasRedirected(false)
  }, [user?.id, tenantId])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-muted-foreground">Loading...</span>
        </div>
      </div>
    )
  }

  if (!user || !checkTenantAccess(tenantId)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-muted-foreground">Verifying access...</span>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
