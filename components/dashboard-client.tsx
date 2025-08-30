"use client"

import type React from "react"
import { formatRelativeTime } from "@/lib/time-utils"
import { useAuth } from "@/components/auth-provider"

import { useState, useCallback, useRef, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { RefreshCw, TrendingUp, Calendar, BarChart3, AlertCircle, Edit2 } from "lucide-react"
import { DataChart } from "@/components/data-chart"
import { ChartTypeSelector } from "@/components/chart-type-selector"
import { DashboardSwitcher } from "@/components/dashboard-switcher"
import { useToast } from "@/hooks/use-toast"
import { ApiClient } from "@/lib/api-client"

interface DataFile {
  id: string
  name: string
  type: string
  data: any
  updated_at: string
  chart_type?: string
  sort_order?: number
  field_order?: string[] // Added field_order to interface
}

interface Dashboard {
  id: string
  title: string
  created_at: string
  updated_at: string
}

interface DashboardClientProps {
  tenantId: string
}

const dataCache = new Map<string, { data: DataFile[]; timestamp: number }>()
const CACHE_DURATION = 30000 // 30 seconds

function ChartSkeleton() {
  return (
    <Card className="animate-pulse">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="h-6 w-32 bg-muted rounded"></div>
          <div className="flex items-center gap-2">
            <div className="h-8 w-20 bg-muted rounded"></div>
            <div className="h-4 w-16 bg-muted rounded"></div>
          </div>
        </div>
        <div className="h-4 w-48 bg-muted rounded"></div>
      </CardHeader>
      <CardContent>
        <div className="h-64 bg-muted rounded"></div>
      </CardContent>
    </Card>
  )
}

export function DashboardClient({ tenantId }: DashboardClientProps) {
  const [dataFiles, setDataFiles] = useState<DataFile[]>([])
  const [currentDashboard, setCurrentDashboard] = useState<Dashboard | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)
  const [isReordering, setIsReordering] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [draggedChart, setDraggedChart] = useState<string | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const mountedRef = useRef(true)
  const { toast } = useToast()
  const { user } = useAuth()
  const isAuthenticated = !!user

  const handleDashboardChange = useCallback((dashboard: Dashboard) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    setCurrentDashboard(dashboard)
    setIsLoading(true)
    setError(null)
    setRetryCount(0)
  }, [])

  const refreshData = useCallback(
    async (useCache = true) => {
      if (!currentDashboard || !mountedRef.current) return

      const cacheKey = `${tenantId}-${currentDashboard.id}`
      const cached = dataCache.get(cacheKey)
      const now = Date.now()

      if (useCache && cached && now - cached.timestamp < CACHE_DURATION) {
        const sortedData = cached.data.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
        if (mountedRef.current) {
          setDataFiles(sortedData)
          setIsLoading(false)
        }
        return
      }

      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }

      abortControllerRef.current = new AbortController()
      if (mountedRef.current) {
        setIsRefreshing(true)
        setError(null)
      }

      try {
        console.log("[v0] Dashboard - Making API call for dashboard:", currentDashboard.id)
        const response = await ApiClient.get(`/api/internal/data-files?dashboardId=${currentDashboard.id}`, {
          signal: abortControllerRef.current.signal,
          tenantId,
        })

        if (!response.ok) {
          const errorText = await response.text()
          console.log("[v0] Dashboard - API error:", response.status, errorText)
          throw new Error(`HTTP ${response.status}: ${errorText}`)
        }

        const newData = await response.json()
        console.log("[v0] Dashboard - API response:", newData)
        const files = Array.isArray(newData) ? newData : []

        const sortedFiles = files.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))

        dataCache.set(cacheKey, { data: sortedFiles, timestamp: now })

        if (mountedRef.current) {
          setDataFiles(sortedFiles)
          setRetryCount(0)
          console.log("[v0] Dashboard - Data loaded successfully:", sortedFiles.length, "files")
        }
      } catch (error: any) {
        if (error.name === "AbortError") {
          return // Request was cancelled, don't update state
        }

        console.error("[v0] Dashboard - Failed to refresh data:", error)

        if (mountedRef.current) {
          setError(error.message || "Failed to load dashboard data")

          setRetryCount((currentRetryCount) => {
            if (currentRetryCount < 3) {
              const delay = Math.pow(2, currentRetryCount) * 1000 // 1s, 2s, 4s
              console.log("[v0] Dashboard - Retrying in", delay, "ms")
              setTimeout(() => {
                if (mountedRef.current) {
                  refreshData(false)
                }
              }, delay)
              return currentRetryCount + 1
            } else {
              toast({
                title: "Connection Error",
                description: "Failed to load dashboard data after multiple attempts",
                variant: "destructive",
              })
              return currentRetryCount
            }
          })
        }
      } finally {
        if (mountedRef.current) {
          setIsRefreshing(false)
          setIsLoading(false)
          console.log("[v0] Dashboard - Loading complete")
        }
      }
    },
    [currentDashboard, tenantId, toast], // Added currentDashboard back to dependencies
  )

  useEffect(() => {
    if (currentDashboard && mountedRef.current) {
      console.log("[v0] Dashboard - Loading data for dashboard:", currentDashboard.id)
      refreshData(true)
    }
  }, [currentDashboard, tenantId]) // Removed refreshData from dependencies and only depend on currentDashboard.id

  const updateChartType = useCallback(
    async (fileId: string, newChartType: string) => {
      if (!mountedRef.current) return

      const originalFiles = dataFiles
      setDataFiles((prev) => prev.map((file) => (file.id === fileId ? { ...file, chart_type: newChartType } : file)))

      try {
        const response = await ApiClient.patch(
          `/api/internal/data-files/${fileId}`,
          { chart_type: newChartType },
          { tenantId },
        )

        if (!response.ok) {
          throw new Error("Failed to update chart type")
        }

        if (currentDashboard) {
          dataCache.delete(`${tenantId}-${currentDashboard.id}`)
        }

        if (mountedRef.current) {
          toast({
            title: "Success",
            description: "Chart type updated successfully",
          })
        }
      } catch (error) {
        console.error("Error updating chart type:", error)

        if (mountedRef.current) {
          setDataFiles(originalFiles)
          toast({
            title: "Error",
            description: "Failed to update chart type",
            variant: "destructive",
          })
        }
        throw error
      }
    },
    [dataFiles, currentDashboard, toast, tenantId],
  )

  const handleMoveChart = useCallback(
    async (fileId: string, direction: "up" | "down") => {
      if (!mountedRef.current) return

      const currentIndex = dataFiles.findIndex((f) => f.id === fileId)
      if (currentIndex === -1) return

      const newIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1
      if (newIndex < 0 || newIndex >= dataFiles.length) return

      setIsReordering(true)

      try {
        const newDataFiles = [...dataFiles]
        const [movedFile] = newDataFiles.splice(currentIndex, 1)
        newDataFiles.splice(newIndex, 0, movedFile)

        const updates = newDataFiles.map((file, index) => ({
          id: file.id,
          sort_order: index,
        }))

        const response = await ApiClient.patch("/api/internal/data-files/reorder", { updates }, { tenantId })

        if (response.ok && mountedRef.current) {
          const updatedFiles = newDataFiles.map((file, index) => ({
            ...file,
            sort_order: index,
          }))
          setDataFiles(updatedFiles)

          if (currentDashboard) {
            dataCache.delete(`${tenantId}-${currentDashboard.id}`)
          }

          toast({
            title: "Success",
            description: "Chart order updated successfully.",
          })
        } else {
          throw new Error("Failed to update chart order")
        }
      } catch (error) {
        if (mountedRef.current) {
          toast({
            title: "Error",
            description: "Failed to update chart order. Please try again.",
            variant: "destructive",
          })
          refreshData(false)
        }
      } finally {
        if (mountedRef.current) {
          setIsReordering(false)
        }
      }
    },
    [dataFiles, currentDashboard, toast, refreshData, tenantId],
  )

  const handleChartDragStart = (e: React.DragEvent, fileId: string, index: number) => {
    setDraggedChart(fileId)
    e.dataTransfer.effectAllowed = "move"
    e.dataTransfer.setData("text/html", fileId)

    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = "0.5"
    }
  }

  const handleChartDragEnd = (e: React.DragEvent) => {
    setDraggedChart(null)
    setDragOverIndex(null)

    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = "1"
    }
  }

  const handleChartDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
    setDragOverIndex(index)
  }

  const handleChartDragLeave = (e: React.DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDragOverIndex(null)
    }
  }

  const handleChartDrop = async (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault()
    setDragOverIndex(null)

    if (!draggedChart || !mountedRef.current) return

    const dragIndex = dataFiles.findIndex((f) => f.id === draggedChart)
    if (dragIndex === -1 || dragIndex === dropIndex) return

    setIsReordering(true)

    try {
      const newDataFiles = [...dataFiles]
      const [movedFile] = newDataFiles.splice(dragIndex, 1)
      newDataFiles.splice(dropIndex, 0, movedFile)

      const updates = newDataFiles.map((file, index) => ({
        id: file.id,
        sort_order: index,
      }))

      const response = await ApiClient.patch("/api/internal/data-files/reorder", { updates }, { tenantId })

      if (response.ok && mountedRef.current) {
        const updatedFiles = newDataFiles.map((file, index) => ({
          ...file,
          sort_order: index,
        }))
        setDataFiles(updatedFiles)

        if (currentDashboard) {
          dataCache.delete(`${tenantId}-${currentDashboard.id}`)
        }

        toast({
          title: "Success",
          description: "Chart order updated successfully.",
        })
      } else {
        throw new Error("Failed to update chart order")
      }
    } catch (error) {
      if (mountedRef.current) {
        toast({
          title: "Error",
          description: "Failed to update chart order. Please try again.",
          variant: "destructive",
        })
        refreshData(false)
      }
    } finally {
      if (mountedRef.current) {
        setIsReordering(false)
        setDraggedChart(null)
      }
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
            return parsedData.map((item) => {
              const processedItem = { ...item }
              columnNames.forEach((col, index) => {
                if (index === 1) {
                  processedItem[col] = Number(item[col]) || 0
                }
              })
              return processedItem
            })
          }
        }
      }

      return []
    } catch (error) {
      console.error("Error processing chart data:", error)
      return []
    }
  }

  const formatDate = (dateString: string) => {
    return formatRelativeTime(dateString)
  }

  const formatTime = (dateString: string) => {
    return ""
  }

  return (
    <div className="space-y-6">
      <DashboardSwitcher
        tenantId={tenantId}
        onDashboardChange={handleDashboardChange}
        currentDashboard={currentDashboard}
      />

      {isLoading && currentDashboard && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="flex items-center justify-center py-4">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Loading dashboard data...</span>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ChartSkeleton />
            <ChartSkeleton />
          </div>
        </div>
      )}

      {error && (
        <div className="flex items-center justify-center py-8 animate-in fade-in duration-300">
          <Card className="w-full max-w-md shadow-lg">
            <CardContent className="flex flex-col items-center text-center p-6">
              <AlertCircle className="h-12 w-12 text-destructive mb-4 animate-pulse" />
              <h3 className="text-lg font-semibold mb-2">Connection Error</h3>
              <p className="text-muted-foreground mb-4">{error}</p>
              <Button
                onClick={() => refreshData(false)}
                disabled={isRefreshing}
                className="transition-all duration-200"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
                Try Again
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {!currentDashboard && !isLoading && (
        <div className="flex flex-col items-center justify-center py-16 animate-in fade-in duration-500">
          <BarChart3 className="h-16 w-16 text-muted-foreground mb-4 animate-bounce" />
          <h2 className="text-2xl font-semibold text-foreground mb-2">Select a Dashboard</h2>
          <p className="text-muted-foreground text-center max-w-md">
            Choose a dashboard from the dropdown above or create a new one to get started.
          </p>
        </div>
      )}

      {currentDashboard && !isLoading && !error && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          {dataFiles.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <BarChart3 className="h-16 w-16 text-muted-foreground mb-4 animate-bounce" />
              <h2 className="text-2xl font-semibold text-foreground mb-2">No Data Available</h2>
              <p className="text-muted-foreground text-center max-w-md">
                Upload XML data through the API to see charts appear here automatically.
              </p>
              <Button
                onClick={() => refreshData(false)}
                className="mt-4 transition-all duration-200"
                disabled={isRefreshing}
              >
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""} sm:mr-2`} />
                <span className="hidden sm:inline">Refresh</span>
              </Button>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-6 animate-in slide-in-from-top-2 duration-300">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                  <Badge
                    variant="secondary"
                    className="text-sm transition-all duration-200 hover:bg-secondary/80 w-fit"
                  >
                    {dataFiles.length} Dataset{dataFiles.length !== 1 ? "s" : ""}
                  </Badge>
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4 mr-1" />
                    <span className="truncate">
                      Last updated:{" "}
                      {dataFiles.length > 0
                        ? formatRelativeTime(Math.max(...dataFiles.map((f) => new Date(f.updated_at).getTime())))
                        : "Never"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 mb-6">
                <Button
                  onClick={() => setIsEditMode(!isEditMode)}
                  variant={isEditMode ? "default" : "outline"}
                  size="sm"
                  className="transition-all duration-200"
                >
                  <Edit2 className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">{isEditMode ? "Done" : "Edit"}</span>
                </Button>
                <Button
                  onClick={() => refreshData(false)}
                  variant="outline"
                  size="sm"
                  disabled={isRefreshing}
                  className="transition-all duration-200 hover:bg-muted"
                >
                  <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""} sm:mr-2`} />
                  <span className="hidden sm:inline">Refresh</span>
                </Button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {dataFiles.map((file, index) => {
                  const chartData = processChartData(file.data, file.field_order)

                  return (
                    <Card
                      key={file.id || file.name}
                      draggable={isEditMode && !isReordering}
                      onDragStart={(e) => isEditMode && handleChartDragStart(e, file.id, index)}
                      onDragEnd={handleChartDragEnd}
                      onDragOver={(e) => isEditMode && handleChartDragOver(e, index)}
                      onDragLeave={handleChartDragLeave}
                      onDrop={(e) => isEditMode && handleChartDrop(e, index)}
                      className={`transition-all duration-300 hover:shadow-lg hover:scale-[1.02] animate-in fade-in slide-in-from-bottom-4 relative ${
                        isEditMode && dragOverIndex === index ? "border-primary bg-primary/5 scale-105" : ""
                      } ${draggedChart === file.id ? "opacity-50" : ""} ${
                        isEditMode && !isReordering ? "cursor-grab active:cursor-grabbing" : ""
                      }`}
                      style={{ animationDelay: `${index * 100}ms` }}
                    >
                      {isEditMode && (
                        <div className="absolute top-2 left-2 z-10 bg-background/90 rounded p-1 shadow-sm">
                          <div className="flex flex-col gap-0.5 text-muted-foreground">
                            <div className="w-1 h-1 bg-current rounded-full"></div>
                            <div className="w-1 h-1 bg-current rounded-full"></div>
                            <div className="w-1 h-1 bg-current rounded-full"></div>
                            <div className="w-1 h-1 bg-current rounded-full"></div>
                            <div className="w-1 h-1 bg-current rounded-full"></div>
                            <div className="w-1 h-1 bg-current rounded-full"></div>
                          </div>
                        </div>
                      )}

                      <CardHeader className="pb-4">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-xl font-semibold capitalize bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                            {file.type}
                          </CardTitle>
                          <div className="flex items-center gap-2">
                            <ChartTypeSelector
                              currentType={file.chart_type || "line"}
                              onTypeChange={(newType) => updateChartType(file.id, newType)}
                              disabled={isRefreshing || isReordering}
                              isAuthenticated={isAuthenticated}
                            />
                            <div className="flex items-center text-sm text-muted-foreground">
                              <TrendingUp className="h-4 w-4 mr-1" />
                              {chartData.length} points
                            </div>
                          </div>
                        </div>
                        <CardDescription>Updated {formatDate(file.updated_at)}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        {(() => {
                          const chartData = processChartData(file.data, file.field_order)
                          return chartData.length === 0 ? (
                            <div className="p-4 text-center text-muted-foreground">
                              <p>No chart data available</p>
                              <p className="text-xs mt-2">Raw data: {JSON.stringify(file.data)}</p>
                            </div>
                          ) : (
                            <div className="animate-in fade-in duration-300">
                              <DataChart
                                data={chartData}
                                title={file.type}
                                chartType={file.chart_type || "line"}
                                fieldOrder={file.field_order}
                                isAuthenticated={isAuthenticated}
                              />
                            </div>
                          )
                        })()}
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
