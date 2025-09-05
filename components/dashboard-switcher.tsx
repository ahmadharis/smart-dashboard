"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Share, Loader2, Home, Tv } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { ApiClient } from "@/lib/api-client"
import { ShareDialog } from "@/components/share-dialog"

interface Dashboard {
  id: string
  title: string
  created_at: string
  updated_at: string
}

interface DashboardSwitcherProps {
  tenantId: string // Added tenantId prop
  onDashboardChange: (dashboard: Dashboard) => void
  currentDashboard: Dashboard | null
}

export function DashboardSwitcher({ tenantId, onDashboardChange, currentDashboard }: DashboardSwitcherProps) {
  const [dashboards, setDashboards] = useState<Dashboard[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSwitching, setIsSwitching] = useState(false)
  const [dashboardTitle, setDashboardTitle] = useState<string>("Select Dashboard")
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false)
  const [tenantApiKey, setTenantApiKey] = useState<string>("")
  const { toast } = useToast()

  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    fetchDashboards()
    fetchDashboardTitle()
    fetchTenantApiKey()
  }, [])

  const fetchDashboardTitle = async () => {
    try {
      const response = await ApiClient.get(`/api/internal/settings`, { tenantId })
      if (response.ok) {
        const settings = await response.json()
        const titleSetting = settings.find((setting: any) => setting.key === "Dashboard-Title")
        if (titleSetting && titleSetting.value) {
          setDashboardTitle(titleSetting.value)
        }
      }
    } catch (error) {
      console.error("Failed to fetch dashboard title:", error)
    }
  }

  const fetchDashboards = async () => {
    try {
      const response = await ApiClient.get(`/api/internal/dashboards`, { tenantId })
      if (response.ok) {
        const data = await response.json()
        setDashboards(data)

        const urlDashboardId = searchParams.get("id")
        let selectedDashboard = null

        if (urlDashboardId) {
          selectedDashboard = data.find((d: Dashboard) => d.id === urlDashboardId)
        }

        if (!selectedDashboard && data.length > 0) {
          selectedDashboard = data[0]
        }

        if (selectedDashboard && !currentDashboard) {
          onDashboardChange(selectedDashboard)
          if (!urlDashboardId || urlDashboardId !== selectedDashboard.id) {
            updateURL(selectedDashboard.id)
          }
        }
      } else {
        const errorData = await response.json()
        const errorMessage = errorData.error || errorData.message || `HTTP ${response.status}: ${response.statusText}`
        throw new Error(`Failed to load dashboards: ${errorMessage}`)
      }
    } catch (error) {
      console.error("Failed to fetch dashboards:", error)
      toast({
        title: "Error",
        description: "Failed to load dashboards",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const fetchTenantApiKey = async () => {
    try {
      const response = await fetch(`/api/public/tenants`, {
        headers: {
          Authorization: `Bearer ${await getAuthToken()}`, // You'll need to implement getAuthToken
        },
      })
      if (response.ok) {
        const tenants = await response.json()
        const currentTenant = tenants.find((t: any) => t.tenant_id === tenantId)
        if (currentTenant?.api_key) {
          setTenantApiKey(currentTenant.api_key)
        }
      }
    } catch (error) {
      console.error("Failed to fetch tenant API key:", error)
    }
  }

  const getAuthToken = async () => {
    // TODO: Implement proper auth token retrieval
    // This should integrate with your auth system (Supabase, etc.)
    throw new Error('getAuthToken not implemented')
  }

  const updateURL = (dashboardId: string) => {
    const url = new URL(window.location.href)
    url.searchParams.set("id", dashboardId)
    router.replace(url.pathname + url.search, { scroll: false })
  }

  const shareDashboard = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (!currentDashboard) return
    setIsShareDialogOpen(true)
  }

  const handleDashboardChange = (dashboardId: string) => {
    const dashboard = dashboards.find((d) => d.id === dashboardId)
    if (dashboard && dashboard.id !== currentDashboard?.id) {
      setIsSwitching(true)
      setTimeout(() => {
        onDashboardChange(dashboard)
        updateURL(dashboard.id)
        setIsSwitching(false)
      }, 150)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-4 mb-8 py-6 animate-pulse">
        <div className="h-6 w-48 bg-muted rounded"></div>
        <div className="h-8 w-32 bg-muted rounded"></div>
        <div className="h-8 w-20 bg-muted rounded"></div>
      </div>
    )
  }

  return (
    <div className="mb-8">
      <div
        className={`transition-all duration-300 ease-in-out ${isSwitching ? "opacity-50 scale-[0.98]" : "opacity-100 scale-100"}`}
      >
        <div className="py-4 sm:py-6 border-b border-border/40">
          {/* Mobile layout - stacked vertically */}
          <div className="flex flex-col gap-4 sm:hidden">
            {/* Top row: Home button and title */}
            <div className="flex items-center gap-3">
              <Link href={`/${tenantId}`}>
                <Button variant="ghost" size="sm" className="hover:bg-muted/50 transition-colors">
                  <Home className="h-4 w-4" />
                </Button>
              </Link>
              <div className="flex items-center gap-2 animate-in slide-in-from-left-2 duration-200">
                <h1 className="text-lg sm:text-2xl font-bold text-foreground truncate">{dashboardTitle}</h1>
                <Badge variant="outline" className="text-xs font-medium shrink-0">
                  {dashboards.length}
                </Badge>
              </div>
            </div>

            {/* Bottom row: Dashboard selector and action buttons */}
            <div className="flex items-center gap-2 animate-in slide-in-from-right-2 duration-200">
              <Select value={currentDashboard?.id || ""} onValueChange={handleDashboardChange} disabled={isSwitching}>
                <SelectTrigger className="flex-1 transition-all duration-200 hover:border-primary/40 bg-background">
                  <SelectValue placeholder="Select dashboard" />
                  {isSwitching && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
                </SelectTrigger>
                <SelectContent>
                  {dashboards.map((dashboard) => (
                    <SelectItem key={dashboard.id} value={dashboard.id} className="transition-colors hover:bg-muted">
                      {dashboard.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {currentDashboard && (
                <>
                  <Link href={`/${tenantId}/tv-mode?dashboardId=${currentDashboard.id}`}>
                    <Button
                      variant="outline"
                      size="sm"
                      className="transition-all duration-200 hover:bg-muted/50 bg-transparent shrink-0"
                    >
                      <Tv className="h-4 w-4" />
                      <span className="sr-only">TV Mode</span>
                    </Button>
                  </Link>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={shareDashboard}
                    className="transition-all duration-200 hover:bg-muted/50 bg-transparent shrink-0"
                  >
                    <Share className="h-4 w-4" />
                    <span className="sr-only">Share</span>
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Desktop layout - horizontal */}
          <div className="hidden sm:flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href={`/${tenantId}`}>
                <Button variant="ghost" size="sm" className="hover:bg-muted/50 transition-colors">
                  <Home className="h-4 w-4" />
                </Button>
              </Link>

              <div className="flex items-center gap-3 animate-in slide-in-from-left-2 duration-200">
                <h1 className="text-2xl font-bold text-foreground">{dashboardTitle}</h1>
                <Badge variant="outline" className="text-xs font-medium">
                  {dashboards.length} dashboard{dashboards.length !== 1 ? "s" : ""}
                </Badge>
              </div>
            </div>

            <div className="flex items-center gap-3 animate-in slide-in-from-right-2 duration-200">
              <Select value={currentDashboard?.id || ""} onValueChange={handleDashboardChange} disabled={isSwitching}>
                <SelectTrigger className="w-48 transition-all duration-200 hover:border-primary/40 bg-background">
                  <SelectValue placeholder="Select dashboard" />
                  {isSwitching && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
                </SelectTrigger>
                <SelectContent>
                  {dashboards.map((dashboard) => (
                    <SelectItem key={dashboard.id} value={dashboard.id} className="transition-colors hover:bg-muted">
                      {dashboard.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {currentDashboard && (
                <>
                  <Link href={`/${tenantId}/tv-mode?dashboardId=${currentDashboard.id}`}>
                    <Button
                      variant="outline"
                      size="sm"
                      className="transition-all duration-200 hover:bg-muted/50 bg-transparent"
                    >
                      <Tv className="h-4 w-4 mr-1" />
                      TV Mode
                    </Button>
                  </Link>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={shareDashboard}
                    className="transition-all duration-200 hover:bg-muted/50 bg-transparent"
                  >
                    <Share className="h-4 w-4 mr-1" />
                    Share
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
      {currentDashboard && (
        <ShareDialog
          isOpen={isShareDialogOpen}
          onClose={() => setIsShareDialogOpen(false)}
          tenantId={tenantId}
          dashboardId={currentDashboard.id}
          dashboardTitle={currentDashboard.title}
          tenantApiKey={tenantApiKey}
        />
      )}
    </div>
  )
}
