"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState, useMemo, useCallback } from "react"
import { createBrowserClient } from "@supabase/ssr"
import type { User } from "@supabase/supabase-js"

interface AuthState {
  user: User | null
  isLoading: boolean
  tenantAccess: Record<string, boolean> // tenantId -> hasAccess
}

interface AuthContextType extends AuthState {
  checkTenantAccess: (tenantId: string) => Promise<boolean>
  clearCache: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isLoading: true,
    tenantAccess: {},
  })

  const supabase = useMemo(
    () => createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!),
    [],
  )

  const checkTenantAccess = useCallback(
    async (tenantId: string): Promise<boolean> => {
      if (!authState.user) return false

      // Check memory cache first
      if (authState.tenantAccess[tenantId] !== undefined) {
        return authState.tenantAccess[tenantId]
      }

      // Check localStorage cache
      const cachedResult = getCachedAccess(authState.user.id, tenantId)
      if (cachedResult !== null) {
        // Update memory cache
        setAuthState((prev) => ({
          ...prev,
          tenantAccess: { ...prev.tenantAccess, [tenantId]: cachedResult },
        }))
        return cachedResult
      }

      // Query database if not cached
      const { data: tenantAccess, error: accessError } = await supabase
        .from("user_tenants")
        .select("id")
        .eq("user_id", authState.user.id)
        .eq("tenant_id", tenantId)
        .single()

      const hasAccess = !accessError && !!tenantAccess

      // Cache the result in both memory and localStorage
      setCachedAccess(authState.user.id, tenantId, hasAccess)
      setAuthState((prev) => ({
        ...prev,
        tenantAccess: { ...prev.tenantAccess, [tenantId]: hasAccess },
      }))

      return hasAccess
    },
    [supabase, authState.user],
  )

  const clearCache = useCallback(() => {
    try {
      const keys = Object.keys(localStorage).filter((key) => key.startsWith(CACHE_KEY_PREFIX))
      keys.forEach((key) => localStorage.removeItem(key))
    } catch {
      // Ignore localStorage errors
    }
    setAuthState((prev) => ({ ...prev, tenantAccess: {} }))
  }, [])

  useEffect(() => {
    let mounted = true

    const initAuth = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (mounted) {
          setAuthState((prev) => ({
            ...prev,
            user,
            isLoading: false,
          }))
        }
      } catch (error) {
        console.error("Auth initialization error:", error)
        if (mounted) {
          setAuthState((prev) => ({ ...prev, isLoading: false }))
        }
      }
    }

    initAuth()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return

      if (event === "SIGNED_IN" && session?.user) {
        setAuthState({
          user: session.user,
          isLoading: false,
          tenantAccess: {},
        })
      } else if (event === "SIGNED_OUT") {
        clearCache()
        setAuthState({
          user: null,
          isLoading: false,
          tenantAccess: {},
        })
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [supabase, clearCache])

  const contextValue: AuthContextType = {
    ...authState,
    checkTenantAccess,
    clearCache,
  }

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
