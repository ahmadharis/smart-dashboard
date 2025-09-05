"use client"

import { createContext, useContext, useEffect, useState, useCallback, useMemo, useRef, type ReactNode } from "react"
import { createClient } from "@/lib/supabase/client"
import { usePathname } from "next/navigation"
import type { User } from "@supabase/supabase-js"

interface TenantAccess {
  [tenantId: string]: boolean
}

interface AuthState {
  user: User | null
  isLoading: boolean
  tenantAccess: TenantAccess
  checkTenantAccess: (tenantId: string) => boolean
  refreshPermissions: () => Promise<void>
}

const AuthContext = createContext<AuthState | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [tenantAccess, setTenantAccess] = useState<TenantAccess>({})

  const isFetchingPermissions = useRef(false)
  const lastAuthEvent = useRef<{ event: string; timestamp: number } | null>(null)
  const retryCount = useRef(0)
  const maxRetries = 3
  const supabase = useMemo(() => createClient(), [])
  const pathname = usePathname()
  const isPublicRoute = pathname?.startsWith("/shared/")

  const shouldProcessAuthEvent = useCallback((event: string): boolean => {
    const now = Date.now()
    const lastEvent = lastAuthEvent.current

    // Debounce identical events within 1 second
    if (lastEvent && lastEvent.event === event && now - lastEvent.timestamp < 1000) {
      return false
    }

    lastAuthEvent.current = { event, timestamp: now }
    return true
  }, [])

  const fetchTenantPermissions = useCallback(
    async (currentUser: User): Promise<TenantAccess> => {
      if (isPublicRoute) {
        return {}
      }

      if (isFetchingPermissions.current) {
        return {}
      }

      isFetchingPermissions.current = true

      try {
        let lastError: Error | null = null
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
          try {
            const response = await fetch("/api/internal/tenant-permissions", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ userId: currentUser.id }),
              signal: AbortSignal.timeout(10000), // 10 second timeout
            })

            if (!response.ok) {
              throw new Error(`HTTP ${response.status}: ${response.statusText}`)
            }

            const contentType = response.headers.get("content-type")
            if (!contentType || !contentType.includes("application/json")) {
              throw new Error("Non-JSON response from tenant permissions API")
            }

            const data = await response.json()
            retryCount.current = 0 // Reset retry count on success
            return data.tenantAccess || {}
          } catch (error) {
            lastError = error as Error
            if (attempt < maxRetries) {
              const delay = Math.pow(2, attempt) * 1000 // Exponential backoff: 1s, 2s, 4s
              await new Promise((resolve) => setTimeout(resolve, delay))
            }
          }
        }

        throw lastError || new Error("Max retries exceeded")
      } catch (error) {
        retryCount.current++
        return {}
      } finally {
        isFetchingPermissions.current = false
      }
    },
    [isPublicRoute],
  )

  const refreshPermissions = useCallback(async () => {
    if (isPublicRoute) {
      return
    }

    const currentUser = user
    if (!currentUser) {
      return
    }

    const freshPermissions = await fetchTenantPermissions(currentUser)
    setTenantAccess(freshPermissions)
  }, [fetchTenantPermissions, isPublicRoute])

  const checkTenantAccess = useCallback(
    (tenantId: string): boolean => {
      return tenantAccess[tenantId] === true
    },
    [tenantAccess],
  )

  useEffect(() => {
    let mounted = true
    let initializationComplete = false

    const initializeAuth = async () => {
      if (initializationComplete) return

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession()

        if (!mounted) return

        if (session?.user) {
          setUser(session.user)

          if (!isPublicRoute) {
            try {
              const permissions = await fetchTenantPermissions(session.user)
              if (mounted) {
                setTenantAccess(permissions)
                setIsLoading(false)
                initializationComplete = true
              }
            } catch (error) {
              if (mounted) {
                setIsLoading(false)
                initializationComplete = true
              }
            }
          } else {
            if (mounted) {
              setIsLoading(false)
              initializationComplete = true
            }
          }
        } else {
          if (mounted) {
            setIsLoading(false)
            initializationComplete = true
          }
        }
      } catch (error) {
        if (mounted) {
          setIsLoading(false)
          initializationComplete = true
        }
      }
    }

    initializeAuth()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!shouldProcessAuthEvent(event)) {
        return
      }

      if (!mounted) return

      try {
        if (event === "SIGNED_IN" && session?.user) {
          setUser(session.user)

          if (!isPublicRoute) {
            try {
              const permissions = await fetchTenantPermissions(session.user)
              if (mounted) {
                setTenantAccess(permissions)
                setIsLoading(false)
              }
            } catch (error) {
              if (mounted) {
                setIsLoading(false)
              }
            }
          } else {
            if (mounted) {
              setIsLoading(false)
            }
          }
        } else if (event === "SIGNED_OUT") {
          if (mounted) {
            setUser(null)
            setTenantAccess({})
            setIsLoading(false)
          }
        } else if (event === "INITIAL_SESSION") {
          if (initializationComplete) {
            return
          }
        }
      } catch (error) {
        if (mounted) {
          setIsLoading(false)
        }
      }
    })

    return () => {
      mounted = false
      if (subscription?.unsubscribe) {
        subscription.unsubscribe()
      }
    }
  }, [supabase, fetchTenantPermissions, shouldProcessAuthEvent, isPublicRoute])

  const contextValue = useMemo(
    () => ({
      user,
      isLoading,
      tenantAccess,
      checkTenantAccess,
      refreshPermissions,
    }),
    [user, isLoading, tenantAccess, checkTenantAccess, refreshPermissions],
  )

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
