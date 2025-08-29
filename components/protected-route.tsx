"use client"

import type React from "react"

import { useAuth } from "./auth-provider"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { Loader2 } from "lucide-react"
import { AccessDenied } from "./access-denied"

interface ProtectedRouteProps {
  children: React.ReactNode
  tenantId: string
}

export function ProtectedRoute({ children, tenantId }: ProtectedRouteProps) {
  const { user, isLoading, checkTenantAccess } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (isLoading) return

    if (!user) {
      router.push("/auth/login")
      return
    }
  }, [user, isLoading, router])

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

  if (!user) {
    return null // Don't render anything while redirecting
  }

  const hasAccess = checkTenantAccess(tenantId)
  if (!hasAccess) {
    return <AccessDenied deniedTenantId={tenantId} />
  }

  return <>{children}</>
}
