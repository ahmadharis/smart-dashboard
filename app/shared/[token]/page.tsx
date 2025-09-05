"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { DataChart } from "@/components/data-chart"
import { Eye, Calendar, AlertCircle, RefreshCw, BarChart3, Tv } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"

interface DataFile {
  id: string
  name: string
  type: string
  data: any
  updated_at: string
  chart_type?: string
  sort_order?: number
  field_order?: string[]
}

interface Dashboard {
  dashboard_id: string
  title: string
  created_at: string
  updated_at: string
}

interface Tenant {
  tenant_id: string
  name: string
}

interface ShareInfo {
  view_count: number
  expires_at: string | null
}

interface PublicDashboardPageProps {
  params: {
    token: string
  }
}

export default function PublicDashboardPage({ params }: PublicDashboardPageProps) {
  const [dashboard, setDashboard] = useState<Dashboard | null>(null)
  const [tenant, setTenant] = useState<Tenant | null>(null)
  const [shareInfo, setShareInfo] = useState<ShareInfo | null>(null)
  const [dataFiles, setDataFiles] = useState<DataFile[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    loadDashboardData()
  }, [params.token])

  const loadDashboardData = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/public/shared/${params.token}`)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `HTTP ${response.status}`)
      }

      const data = await response.json()
      setDashboard(data.dashboard)
      setTenant(data.tenant)
      setShareInfo(data.share)

      await fetchDataFiles()
    } catch (error: any) {
      console.error("Dashboard loading error:", error)
      setError(error.message || "Failed to load dashboard")
    } finally {
      setIsLoading(false)
    }
  }

  const fetchDataFiles = async () => {
    try {
      const response = await fetch(`/api/public/shared/${params.token}/data-files`)

      if (!response.ok) {
        throw new Error("Failed to fetch data files")
      }

      const files = await response.json()

      const sortedFiles = Array.isArray(files) ? files.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)) : []
      setDataFiles(sortedFiles)
    } catch (error: any) {
      toast({
        title: "Warning",
        description: "Failed to load chart data",
        variant: "destructive",
      })
    }
  }

  const processChartData = (rawData: any, fieldOrder?: string[]) => {
    try {
      let parsedData = rawData

      if (typeof rawData === "string") {
        parsedData = JSON.parse(rawData)
      }

      if (Array.isArray(parsedData) && parsedData.length > 0) {
        const firstItem = parsedData[0]
        if (firstItem && typeof firstItem === "object") {
          const columnNames = fieldOrder && fieldOrder.length > 0 ? fieldOrder : Object.keys(firstItem)

          if (columnNames.length >= 2) {
            const processedData = parsedData.map((item) => {
              const processedItem = { ...item }
              columnNames.forEach((col, index) => {
                if (index === 1) {
                  processedItem[col] = Number(item[col]) || 0
                }
              })
              return processedItem
            })

            return processedData
          }
        }
      }

      return []
    } catch (error) {
      return []
    }
  }

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

    if (diffInSeconds < 60) return "Just now"
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
    return `${Math.floor(diffInSeconds / 86400)}d ago`
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center mb-4">
              <AlertCircle className="h-6 w-6 text-destructive" />
            </div>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={loadDashboardData} variant="outline" className="w-full bg-transparent">
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex items-center justify-center space-x-2">
              <RefreshCw className="h-6 w-6 animate-spin" />
              <span>Loading dashboard...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 pt-4">
        <div className="mb-8">
          <div className="py-4 sm:py-6 border-b border-border/40">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="space-y-1">
                <h1 className="text-2xl font-bold text-foreground">
                  {tenant?.name} - {dashboard?.title}
                </h1>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Eye className="h-4 w-4" />
                    <span>{shareInfo?.view_count || 0} views</span>
                  </div>
                  {shareInfo?.expires_at && (
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      <span>Expires {formatRelativeTime(shareInfo.expires_at)}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  {dataFiles.length} Dataset{dataFiles.length !== 1 ? "s" : ""}
                </Badge>
                <Link href={`/shared/${params.token}/tv-mode`}>
                  <Button variant="outline" size="sm" className="transition-all duration-200 bg-transparent">
                    <Tv className="h-4 w-4 sm:mr-2" />
                    <span className="hidden sm:inline">TV Mode</span>
                  </Button>
                </Link>
                <Button
                  onClick={fetchDataFiles}
                  variant="outline"
                  size="sm"
                  className="transition-all duration-200 bg-transparent"
                >
                  <RefreshCw className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Refresh</span>
                </Button>
              </div>
            </div>
          </div>
        </div>

        {dataFiles.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <BarChart3 className="h-16 w-16 text-muted-foreground mb-4" />
            <h2 className="text-2xl font-semibold text-foreground mb-2">No Data Available</h2>
            <p className="text-muted-foreground text-center max-w-md">
              This dashboard doesn't have any data to display yet.
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-8">
              {dataFiles.map((file, index) => {
                const chartData = processChartData(file.data, file.field_order)

                return (
                  <Card
                    key={file.id || file.name}
                    className="transition-all duration-300 hover:shadow-lg animate-in fade-in slide-in-from-bottom-4"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <CardHeader className="pb-4">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-xl font-semibold capitalize">{file.type}</CardTitle>
                        <div className="flex items-center text-sm text-muted-foreground">
                          <BarChart3 className="h-4 w-4 mr-1" />
                          {chartData.length} points
                        </div>
                      </div>
                      <CardDescription>Updated {formatRelativeTime(file.updated_at)}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {chartData.length === 0 ? (
                        <div className="p-4 text-center text-muted-foreground">
                          <p>No chart data available</p>
                        </div>
                      ) : (
                        <DataChart
                          data={chartData}
                          title={file.type}
                          chartType={file.chart_type || "line"}
                          fieldOrder={file.field_order}
                          isAuthenticated={false} // Disable chart type selector for public view
                        />
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
