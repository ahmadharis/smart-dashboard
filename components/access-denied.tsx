"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowRight, AlertCircle, LogOut, Home } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "./auth-provider"
import { createBrowserClient } from "@supabase/ssr"

interface Tenant {
  tenant_id: string
  name: string
}

interface AccessDeniedProps {
  deniedTenantId: string
}

export function AccessDenied({ deniedTenantId }: AccessDeniedProps) {
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [selectedTenant, setSelectedTenant] = useState<string>("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>("")
  const router = useRouter()
  const { user, checkTenantAccess } = useAuth()

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  useEffect(() => {
    fetchTenants()
  }, [])

  const fetchTenants = async () => {
    try {
      const response = await fetch("/api/public/tenants")

      if (!response.ok) {
        // Handle HTTP error responses
        const contentType = response.headers.get("content-type")
        if (contentType && contentType.includes("application/json")) {
          const errorData = await response.json()
          setError(errorData.error || `Server error (${response.status})`)
        } else {
          // Handle non-JSON error responses (like rate limits)
          const errorText = await response.text()
          if (errorText.includes("Too Many Requests") || errorText.includes("rate limit")) {
            setError("Database is temporarily busy. Please try again in a moment.")
          } else {
            setError(`Server error (${response.status}). Please try again.`)
          }
        }
        return
      }

      // Handle successful responses
      const contentType = response.headers.get("content-type")
      if (contentType && contentType.includes("application/json")) {
        const data = await response.json()
        const accessibleTenants = data.filter((tenant: Tenant) => checkTenantAccess(tenant.tenant_id))
        setTenants(accessibleTenants)
      } else {
        setError("Server returned unexpected response format")
      }
    } catch (error) {
      console.error("Error fetching tenants:", error)
      setError("Failed to connect to server")
    } finally {
      setLoading(false)
    }
  }

  const handleContinue = () => {
    if (selectedTenant) {
      router.push(`/${selectedTenant}`)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/")
  }

  const handleGoHome = () => {
    router.push("/")
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="container mx-auto px-4">
        <div className="max-w-md mx-auto">
          <div className="text-center mb-8">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-foreground mb-2">Access Denied</h1>
            <p className="text-muted-foreground">You don't have permission to access this tenant</p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Choose Another Tenant</CardTitle>
              <CardDescription>
                You don't have access to the requested tenant. Please select from your available tenants below.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert className="border-red-500 bg-red-50">
                <AlertCircle className="h-4 w-4 text-red-700" />
                <AlertDescription className="text-red-900">
                  <div className="font-semibold mb-1">Access Denied</div>
                  You don't have permission to access the requested tenant. Contact your administrator if you believe
                  this is an error.
                </AlertDescription>
              </Alert>

              {error && (
                <Alert className="border-red-200 bg-red-50">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <AlertDescription className="text-red-800">{error}</AlertDescription>
                </Alert>
              )}

              {tenants.length > 0 ? (
                <>
                  <Select value={selectedTenant} onValueChange={setSelectedTenant}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a tenant you have access to..." />
                    </SelectTrigger>
                    <SelectContent>
                      {tenants.map((tenant) => (
                        <SelectItem key={tenant.tenant_id} value={tenant.tenant_id}>
                          {tenant.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Button onClick={handleContinue} disabled={!selectedTenant} className="w-full">
                    Continue to Selected Tenant
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </>
              ) : (
                <div className="text-center py-4">
                  <p className="text-muted-foreground mb-4">
                    You don't have access to any tenants. Please contact your administrator.
                  </p>
                </div>
              )}

              <Button onClick={handleGoHome} variant="secondary" className="w-full">
                <Home className="h-4 w-4 mr-2" />
                Go Home
              </Button>

              <Button onClick={handleLogout} variant="outline" className="w-full bg-transparent">
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
