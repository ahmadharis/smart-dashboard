"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { AlertCircle } from "lucide-react"
import { LoginForm } from "./login-form"
import { useAuth } from "./auth-context"

interface AuthGuardProps {
  children: React.ReactNode
  tenantId: string
  requireAuth?: boolean
}

export function AuthGuard({ children, tenantId, requireAuth = false }: AuthGuardProps) {
  const { user, isLoading, checkTenantAccess } = useAuth()
  const [hasAccess, setHasAccess] = useState<boolean | null>(null)
  const [error, setError] = useState<string>("")
  const router = useRouter()

  useEffect(() => {
    const verifyAccess = async () => {
      setError("")
      setHasAccess(null)

      if (!requireAuth) {
        setHasAccess(true)
        return
      }

      if (!user) {
        setError("authentication_required")
        return
      }

      try {
        const userHasAccess = await checkTenantAccess(tenantId)
        if (!userHasAccess) {
          setError("access_denied")
          return
        }
        setHasAccess(true)
      } catch (error) {
        console.error("Tenant access check error:", error)
        setError("auth_error")
      }
    }

    if (!isLoading) {
      verifyAccess()
    }
  }, [user, tenantId, requireAuth, checkTenantAccess, isLoading])

  const handleLoginSuccess = () => {
    setError("")
    // Auth context will handle the state update
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  if (requireAuth && hasAccess === null && !error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Checking access...</p>
        </div>
      </div>
    )
  }

  if (error === "authentication_required") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="container mx-auto px-4">
          <div className="max-w-md mx-auto">
            <div className="text-center mb-6">
              <AlertCircle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
              <h1 className="text-2xl font-bold text-foreground mb-2">Authentication Required</h1>
              <p className="text-muted-foreground">You need to be logged in to access this page.</p>
            </div>

            <LoginForm onSuccess={handleLoginSuccess} />

            <div className="mt-6 text-center">
              <Button variant="outline" onClick={() => router.push(`/${tenantId}`)} className="w-full">
                Back to Dashboard
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error === "access_denied") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="container mx-auto px-4">
          <div className="max-w-md mx-auto text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-foreground mb-2">Access Denied</h1>
            <p className="text-muted-foreground mb-6">
              You don't have permission to access this tenant's protected resources.
            </p>
            <div className="space-y-3">
              <Button onClick={() => router.push("/")} className="w-full">
                Select Different Tenant
              </Button>
              <Button variant="outline" onClick={() => router.push(`/${tenantId}`)} className="w-full">
                Back to Dashboard
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error === "auth_error") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="container mx-auto px-4">
          <div className="max-w-md mx-auto text-center">
            <Alert className="border-red-200 bg-red-50">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                An error occurred while verifying your access. Please try again.
              </AlertDescription>
            </Alert>
            <Button onClick={() => window.location.reload()} className="w-full mt-4">
              Try Again
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (!hasAccess) {
    return null
  }

  return <>{children}</>
}
