"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import { createClient } from "@/lib/supabase/client"
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

const CACHE_KEY = "tenant_access_cache"
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

interface CacheData {
  tenantAccess: TenantAccess
  timestamp: number
  userId: string
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [tenantAccess, setTenantAccess] = useState<TenantAccess>({})
  const supabase = createClient()

  // Load cached permissions
  const loadCachedPermissions = (currentUser: User | null): TenantAccess => {
    if (!currentUser) return {}

    try {
      const cached = localStorage.getItem(CACHE_KEY)
      if (cached) {
        const cacheData: CacheData = JSON.parse(cached)
        const isExpired = Date.now() - cacheData.timestamp > CACHE_DURATION
        const isSameUser = cacheData.userId === currentUser.id

        if (!isExpired && isSameUser) {
          console.log("[v0] Loaded cached tenant permissions:", cacheData.tenantAccess)
          return cacheData.tenantAccess
        }
      }
    } catch (error) {
      console.error("[v0] Error loading cached permissions:", error)
    }

    return {}
  }

  // Save permissions to cache
  const saveCachedPermissions = (permissions: TenantAccess, userId: string) => {
    try {
      const cacheData: CacheData = {
        tenantAccess: permissions,
        timestamp: Date.now(),
        userId,
      }
      localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData))
      console.log("[v0] Saved tenant permissions to cache:", permissions)
    } catch (error) {
      console.error("[v0] Error saving cached permissions:", error)
    }
  }

  // Fetch fresh permissions from server
  const fetchTenantPermissions = async (currentUser: User): Promise<TenantAccess> => {
    try {
      console.log("[v0] Fetching fresh tenant permissions from server")
      const { data, error } = await supabase.from("user_tenants").select("tenant_id").eq("user_id", currentUser.id)

      if (error) {
        console.error("[v0] Error fetching tenant permissions:", error)
        return {}
      }

      const permissions: TenantAccess = {}
      data?.forEach((row) => {
        permissions[row.tenant_id] = true
      })

      console.log("[v0] Fetched tenant permissions:", permissions)
      return permissions
    } catch (error) {
      console.error("[v0] Error fetching tenant permissions:", error)
      return {}
    }
  }

  // Refresh permissions from server
  const refreshPermissions = async () => {
    if (!user) return

    const freshPermissions = await fetchTenantPermissions(user)
    setTenantAccess(freshPermissions)
    saveCachedPermissions(freshPermissions, user.id)
  }

  // Check if user has access to tenant
  const checkTenantAccess = (tenantId: string): boolean => {
    const hasAccess = tenantAccess[tenantId] === true
    console.log("[v0] Checking tenant access:", { tenantId, hasAccess, cachedPermissions: tenantAccess })
    return hasAccess
  }

  // Initialize auth state
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const {
          data: { user: currentUser },
        } = await supabase.auth.getUser()
        setUser(currentUser)

        if (currentUser) {
          // Load cached permissions first for instant access
          const cached = loadCachedPermissions(currentUser)
          setTenantAccess(cached)

          // If no cache or cache is old, fetch fresh permissions
          if (Object.keys(cached).length === 0) {
            const fresh = await fetchTenantPermissions(currentUser)
            setTenantAccess(fresh)
            saveCachedPermissions(fresh, currentUser.id)
          }
        } else {
          // Clear cache if no user
          localStorage.removeItem(CACHE_KEY)
          setTenantAccess({})
        }
      } catch (error) {
        console.error("[v0] Error initializing auth:", error)
      } finally {
        setIsLoading(false)
      }
    }

    initializeAuth()

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("[v0] Auth state changed:", event)

      if (event === "SIGNED_IN" && session?.user) {
        setUser(session.user)
        // Fetch fresh permissions on login
        const fresh = await fetchTenantPermissions(session.user)
        setTenantAccess(fresh)
        saveCachedPermissions(fresh, session.user.id)
      } else if (event === "SIGNED_OUT") {
        setUser(null)
        setTenantAccess({})
        localStorage.removeItem(CACHE_KEY)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  // Periodic refresh of permissions
  useEffect(() => {
    if (!user) return

    const interval = setInterval(() => {
      console.log("[v0] Periodic refresh of tenant permissions")
      refreshPermissions()
    }, CACHE_DURATION)

    return () => clearInterval(interval)
  }, [user])

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        tenantAccess,
        checkTenantAccess,
        refreshPermissions,
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
