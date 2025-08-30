"use client"

import { createContext, useContext, useEffect, useState, useCallback, useRef, type ReactNode } from "react"
import { createClient } from "@/lib/supabase/client"
import type { User } from "@supabase/supabase-js"
import { useRouter } from "next/navigation"

interface TenantAccess {
  [tenantId: string]: boolean
}

interface AuthState {
  user: User | null
  isLoading: boolean
  tenantAccess: TenantAccess
  checkTenantAccess: (tenantId: string) => boolean
  refreshPermissions: () => Promise<void>
  clearSession: () => Promise<void>
}

const AuthContext = createContext<AuthState | undefined>(undefined)

const SESSION_CHECK_INTERVAL = 5 * 60 * 1000 // 5 minutes
const MAX_LOADING_TIME = 10 * 1000 // 10 seconds max loading
const SESSION_VALIDATION_TIMEOUT = 5 * 1000 // 5 seconds for session validation

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [tenantAccess, setTenantAccess] = useState<TenantAccess>({})
  const router = useRouter()
  const supabase = createClient()

  const sessionCheckInterval = useRef<NodeJS.Timeout | null>(null)
  const loadingTimeout = useRef<NodeJS.Timeout | null>(null)
  const isInitialized = useRef(false)

  const clearSession = useCallback(async () => {
    setUser(null)
    setTenantAccess({})
    setIsLoading(false)

    // Clear any stored session data
    try {
      await supabase.auth.signOut({ scope: "local" })
    } catch (error) {
      console.error("Error clearing session:", error)
    }
  }, [supabase])

  const validateSession = useCallback(async (): Promise<boolean> => {
    try {
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error("Session validation timeout")), SESSION_VALIDATION_TIMEOUT)
      })

      const sessionPromise = supabase.auth.getSession()

      const {
        data: { session },
        error,
      } = await Promise.race([sessionPromise, timeoutPromise])

      if (error || !session?.user) {
        return false
      }

      // Check if session is expired
      const now = Math.floor(Date.now() / 1000)
      if (session.expires_at && session.expires_at < now) {
        return false
      }

      return true
    } catch (error) {
      console.error("Session validation failed:", error)
      return false
    }
  }, [supabase])

  const fetchTenantPermissions = async (currentUser: User): Promise<TenantAccess> => {
    try {
      const { data, error } = await supabase.from("user_tenants").select("tenant_id").eq("user_id", currentUser.id)

      if (error) {
        console.error("Error fetching tenant permissions:", error)
        return {}
      }

      const permissions: TenantAccess = {}
      data?.forEach((row) => {
        permissions[row.tenant_id] = true
      })

      return permissions
    } catch (error) {
      console.error("Error fetching tenant permissions:", error)
      return {}
    }
  }

  const refreshPermissions = useCallback(async () => {
    if (!user) return

    const freshPermissions = await fetchTenantPermissions(user)
    setTenantAccess(freshPermissions)
  }, [user])

  const checkTenantAccess = (tenantId: string): boolean => {
    return tenantAccess[tenantId] === true
  }

  const startSessionMonitoring = useCallback(() => {
    if (sessionCheckInterval.current) {
      clearInterval(sessionCheckInterval.current)
    }

    sessionCheckInterval.current = setInterval(async () => {
      if (!user) return

      const isValid = await validateSession()
      if (!isValid) {
        console.log("Session expired or invalid, clearing session")
        await clearSession()

        // Only redirect if we're not already on auth pages
        if (!window.location.pathname.startsWith("/auth")) {
          router.push("/auth/login?error=session-expired")
        }
      }
    }, SESSION_CHECK_INTERVAL)
  }, [user, validateSession, clearSession, router])

  useEffect(() => {
    if (isInitialized.current) return
    isInitialized.current = true

    const initializeAuth = async () => {
      try {
        // Set a maximum loading timeout
        loadingTimeout.current = setTimeout(() => {
          console.warn("Auth initialization timeout, clearing session")
          clearSession()
        }, MAX_LOADING_TIME)

        const isValid = await validateSession()

        if (isValid) {
          const {
            data: { session },
          } = await supabase.auth.getSession()

          if (session?.user) {
            setUser(session.user)
            const permissions = await fetchTenantPermissions(session.user)
            setTenantAccess(permissions)
            startSessionMonitoring()
          } else {
            await clearSession()
          }
        } else {
          await clearSession()
        }
      } catch (error) {
        console.error("Error initializing auth:", error)
        await clearSession()
      } finally {
        if (loadingTimeout.current) {
          clearTimeout(loadingTimeout.current)
          loadingTimeout.current = null
        }
        setIsLoading(false)
      }
    }

    initializeAuth()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      try {
        if (event === "SIGNED_IN" && session?.user) {
          setUser(session.user)
          const permissions = await fetchTenantPermissions(session.user)
          setTenantAccess(permissions)
          startSessionMonitoring()
        } else if (event === "SIGNED_OUT" || (event === "TOKEN_REFRESHED" && !session)) {
          await clearSession()
          if (sessionCheckInterval.current) {
            clearInterval(sessionCheckInterval.current)
            sessionCheckInterval.current = null
          }
        } else if (event === "TOKEN_REFRESHED" && session?.user) {
          // Session refreshed successfully, update user
          setUser(session.user)
        }
      } catch (error) {
        console.error("Auth state change error:", error)
        await clearSession()
      } finally {
        setIsLoading(false)
      }
    })

    return () => {
      subscription.unsubscribe()
      if (sessionCheckInterval.current) {
        clearInterval(sessionCheckInterval.current)
      }
      if (loadingTimeout.current) {
        clearTimeout(loadingTimeout.current)
      }
    }
  }, [supabase, validateSession, clearSession, startSessionMonitoring])

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        tenantAccess,
        checkTenantAccess,
        refreshPermissions,
        clearSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
