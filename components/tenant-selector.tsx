"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Building2, ArrowRight, AlertCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface Tenant {
  tenant_id: string
  name: string
}

export function TenantSelector() {
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [selectedTenant, setSelectedTenant] = useState<string>("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>("")
  const [isAccessDenied, setIsAccessDenied] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const errorParam = searchParams.get("error")
    const tenantParam = searchParams.get("tenant")

    if (errorParam === "access_denied" && tenantParam) {
      setIsAccessDenied(true)
      setError(
        `You don't have permission to access the requested tenant. Please select a tenant you have access to below, or contact your administrator for assistance.`,
      )
    }

    fetchTenants()
  }, [searchParams])

  const fetchTenants = async () => {
    try {
      const response = await fetch("/api/public/tenants")
      if (response.ok) {
        const data = await response.json()
        setTenants(data)

        if (data.length === 1) {
          router.push(`/${data[0].tenant_id}`)
          return
        }
      } else {
        const errorData = await response.json()
        setError(errorData.error || "Failed to fetch tenants")
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
      localStorage.setItem("selectedTenant", selectedTenant)
      router.push(`/${selectedTenant}`)
    }
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
            <Building2 className="h-12 w-12 text-primary mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-foreground mb-2">Select Tenant</h1>
            <p className="text-muted-foreground">Choose which tenant you'd like to access</p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Available Tenants</CardTitle>
              <CardDescription>Select a tenant to continue to the home page</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {error && (
                <Alert className={isAccessDenied ? "border-red-500 bg-red-50 shadow-lg" : "border-red-200 bg-red-50"}>
                  <AlertCircle className={`h-4 w-4 ${isAccessDenied ? "text-red-700" : "text-red-600"}`} />
                  <AlertDescription className={`${isAccessDenied ? "text-red-900 font-medium" : "text-red-800"}`}>
                    {isAccessDenied && <div className="font-semibold text-red-900 mb-1">Access Denied</div>}
                    {error}
                  </AlertDescription>
                </Alert>
              )}

              <Select value={selectedTenant} onValueChange={setSelectedTenant}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a tenant..." />
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
                Continue to Home Page
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
