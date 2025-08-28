"use client"

import { createContext, useContext, useEffect, useState, useCallback, useRef, type ReactNode } from "react"
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

  const processedSessionRef = useRef<string | null>(null)
  const previousAuthStateRef = useRef<string | null>(null)

  const loadCachedPermissions = (currentUser: User | null): TenantAccess => {
    if (!currentUser) return {}

    try {
      const cached = localStorage.getItem(CACHE_KEY)
      if (cached) {
        const cacheData: CacheData = JSON.parse(cached)
        const isExpired = Date.now() - cacheData.timestamp > CACHE_DURATION
        const isSameUser = cacheData.userId === currentUser.id

        if (!isExpired && isSameUser) {
          return cacheData.tenantAccess
        }
      }
    } catch (error) {
      console.error("[v0] Error loading cached permissions:", error)
    }

    return {}
  }

  const saveCachedPermissions = (permissions: TenantAccess, userId: string) => {
    try {
      const cacheData: CacheData = {
        tenantAccess: permissions,
        timestamp: Date.now(),
        userId,
      }
      localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData))
    } catch (error) {
      console.error("[v0] Error saving cached permissions:", error)
    }
  }

  const fetchTenantPermissions = async (currentUser: User): Promise<TenantAccess> => {
    try {
      const { data, error } = await supabase.from("user_tenants").select("tenant_id").eq("user_id", currentUser.id)

      if (error) {
        console.error("[v0] Error fetching tenant permissions:", error)
        return {}
      }

      const permissions: TenantAccess = {}
      data?.forEach((row) => {
        permissions[row.tenant_id] = true
      })

      return permissions
    } catch (error) {
      console.error("[v0] Error fetching tenant permissions:", error)
      return {}
    }
  }

  const refreshPermissions = useCallback(async () => {
    if (!user) return

    const freshPermissions = await fetchTenantPermissions(user)
    setTenantAccess(freshPermissions)
    saveCachedPermissions(freshPermissions, user.id)
  }, [user])

  const checkTenantAccess = (tenantId: string): boolean => {
    const hasAccess = tenantAccess[tenantId] === true
    return hasAccess
  }

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const {
          data: { user: currentUser },
        } = await supabase.auth.getUser()
        setUser(currentUser)

        if (currentUser) {
          processedSessionRef.current = currentUser.id

          const cached = loadCachedPermissions(currentUser)
          setTenantAccess(cached)

          if (Object.keys(cached).length === 0) {
            const fresh = await fetchTenantPermissions(currentUser)
            setTenantAccess(fresh)
            saveCachedPermissions(fresh, currentUser.id)
          }
        } else {
          localStorage.removeItem(CACHE_KEY)
          setTenantAccess({})
          processedSessionRef.current = null
        }
      } catch (error) {
        console.error("[v0] Error initializing auth:", error)
      } finally {
        setIsLoading(false)
      }
    }

    initializeAuth()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      const currentStateKey = `${event}-${session?.user?.id || "null"}`
      if (previousAuthStateRef.current !== currentStateKey) {
        previousAuthStateRef.current = currentStateKey
      }

      if (event === "SIGNED_IN" && session?.user) {
        if (processedSessionRef.current !== session.user.id) {
          setUser(session.user)
          processedSessionRef.current = session.user.id

          const fresh = await fetchTenantPermissions(session.user)
          setTenantAccess(fresh)
          saveCachedPermissions(fresh, session.user.id)
        }
      } else if (event === "SIGNED_OUT") {
        setUser(null)
        setTenantAccess({})
        localStorage.removeItem(CACHE_KEY)
        processedSessionRef.current = null
        previousAuthStateRef.current = null
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!user) return

    const interval = setInterval(() => {
      refreshPermissions()
    }, CACHE_DURATION)

    return () => clearInterval(interval)
  }, [user, refreshPermissions])

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
