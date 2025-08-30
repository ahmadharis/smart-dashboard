"use client"

import { createContext, useContext, useEffect, useState, useCallback, useMemo, type ReactNode } from "react"
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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [tenantAccess, setTenantAccess] = useState<TenantAccess>({})

  const supabase = useMemo(() => createClient(), [])

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

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession()

        if (session?.user) {
          setUser(session.user)
          const permissions = await fetchTenantPermissions(session.user)
          setTenantAccess(permissions)
        }
      } catch (error) {
        console.error("Error initializing auth:", error)
      } finally {
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
        } else if (event === "SIGNED_OUT") {
          setUser(null)
          setTenantAccess({})
        }
      } catch (error) {
        console.error("Auth state change error:", error)
      } finally {
        setIsLoading(false)
      }
    })

    return () => {
      if (subscription?.unsubscribe) {
        subscription.unsubscribe()
      }
    }
  }, []) // Removed supabase from dependency array since it's now memoized

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
