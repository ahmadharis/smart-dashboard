"use client"

import type React from "react"
import { useEffect, useState, useMemo, useCallback } from "react"
import { useRouter } from "next/navigation"
import { createBrowserClient } from "@supabase/ssr"
import type { User } from "@supabase/supabase-js"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { AlertCircle } from "lucide-react"
import { LoginForm } from "./login-form"

interface AuthGuardProps {
  children: React.ReactNode
  tenantId: string
  requireAuth?: boolean
}

const CACHE_KEY_PREFIX = "tenant_access_"
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

interface CachedAccess {
  hasAccess: boolean
  timestamp: number
  userId: string
  tenantId: string
}

const getCachedAccess = (userId: string, tenantId: string): boolean | null => {
  try {
    const cached = localStorage.getItem(`${CACHE_KEY_PREFIX}${userId}_${tenantId}`)
    if (!cached) return null

    const data: CachedAccess = JSON.parse(cached)
    const isExpired = Date.now() - data.timestamp > CACHE_DURATION

    if (isExpired || data.userId !== userId || data.tenantId !== tenantId) {
      localStorage.removeItem(`${CACHE_KEY_PREFIX}${userId}_${tenantId}`)
      return null
    }

    return data.hasAccess
  } catch {
    return null
  }
}

const setCachedAccess = (userId: string, tenantId: string, hasAccess: boolean) => {
  try {
    const data: CachedAccess = {
      hasAccess,
      timestamp: Date.now(),
      userId,
      tenantId,
    }
    localStorage.setItem(`${CACHE_KEY_PREFIX}${userId}_${tenantId}`, JSON.stringify(data))
  } catch {
    // Ignore localStorage errors
  }
}

const clearUserCache = (userId: string) => {
  try {
    const keys = Object.keys(localStorage).filter((key) => key.startsWith(CACHE_KEY_PREFIX) && key.includes(userId))
    keys.forEach((key) => localStorage.removeItem(key))
  } catch {
    // Ignore localStorage errors
  }
}

export function AuthGuard({ children, tenantId, requireAuth = false }: AuthGuardProps) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [hasAccess, setHasAccess] = useState(false)
  const [error, setError] = useState<string>("")
  const router = useRouter()

  const supabase = useMemo(
    () => createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!),
    [],
  )

  const checkTenantAccess = useCallback(
    async (userId: string): Promise<boolean> => {
      // Check cache first
      const cachedResult = getCachedAccess(userId, tenantId)
      if (cachedResult !== null) {
        return cachedResult
      }

      // Query database if not cached
      const { data: tenantAccess, error: accessError } = await supabase
        .from("user_tenants")
        .select("id")
        .eq("user_id", userId)
        .eq("tenant_id", tenantId)
        .single()

      const hasAccess = !accessError && !!tenantAccess

      // Cache the result
      setCachedAccess(userId, tenantId, hasAccess)

      return hasAccess
    },
    [supabase, tenantId],
  )

  const checkAuth = useCallback(async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      setUser(user)

      if (!requireAuth) {
        setHasAccess(true)
        setLoading(false)
        return
      }

      if (!user) {
        setError("authentication_required")
        setLoading(false)
        return
      }

      const userHasAccess = await checkTenantAccess(user.id)

      if (!userHasAccess) {
        setError("access_denied")
        setLoading(false)
        return
      }

      setHasAccess(true)
      setError("") // Clear any previous errors on successful auth
    } catch (error) {
      console.error("Auth check error:", error)
      setError("auth_error")
    } finally {
      setLoading(false)
    }
  }, [supabase, requireAuth, checkTenantAccess])

  useEffect(() => {
    checkAuth()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
        clearUserCache(session.user.id)
        checkAuth()
      } else if (event === "SIGNED_OUT") {
        setUser(null)
        setHasAccess(false)
        try {
          const keys = Object.keys(localStorage).filter((key) => key.startsWith(CACHE_KEY_PREFIX))
          keys.forEach((key) => localStorage.removeItem(key))
        } catch {
          // Ignore localStorage errors
        }
        if (requireAuth) {
          setError("authentication_required")
        }
      }
    })

    return () => subscription.unsubscribe()
  }, [checkAuth, supabase, requireAuth])

  const handleLoginSuccess = () => {
    setError("")
    checkAuth()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Verifying access...</p>
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
            <Button onClick={() => router.refresh()} className="w-full mt-4">
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
