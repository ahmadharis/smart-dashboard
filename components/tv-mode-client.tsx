"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { X, Tv, AlertCircle, Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { DataChart } from "@/components/data-chart"
import { DashboardSwitcher } from "@/components/dashboard-switcher"
import { useToast } from "@/hooks/use-toast"
import { ApiClient } from "@/lib/api-client"
import { formatRelativeTime } from "@/lib/time-utils"
import { TVModeSettingsPanel, loadTVModeSettings, type TVModeSettings } from "@/components/tv-mode-settings"

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
  id: string
  title: string
  created_at: string
  updated_at: string
  error?: string
}

interface TVModeClientProps {
  tenantId: string
  dashboardId?: string
}

interface ChartSlide {
  charts: DataFile[]
  slideIndex: number
}

const dataCache = new Map<string, { data: DataFile[]; timestamp: number }>()

export function TVModeClient({ tenantId, dashboardId }: TVModeClientProps) {
  const [dataFiles, setDataFiles] = useState<DataFile[]>([])
  const [currentDashboard, setCurrentDashboard] = useState<Dashboard | null>(null)
  const [dashboardTitle, setDashboardTitle] = useState<string>("Dashboard")
  const [slides, setSlides] = useState<ChartSlide[]>([])
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [chartsPerSlide, setChartsPerSlide] = useState(2)
  const [isPaused, setIsPaused] = useState(false)
  const [retryCount, setRetryCount] = useState(0)
  const [showControls, setShowControls] = useState(false)
  const [settings, setSettings] = useState<TVModeSettings>(loadTVModeSettings())
  const [showSettings, setShowSettings] = useState(false)

  const router = useRouter()
  const { toast } = useToast()
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const hideControlsTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const fetchDashboardTitle = useCallback(async () => {
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
  }, [tenantId])

  useEffect(() => {
    fetchDashboardTitle()
  }, [fetchDashboardTitle])

  const updateChartsPerSlide = useCallback(() => {
    const width = window.innerWidth
    const height = window.innerHeight
    const aspectRatio = width / height

    let newChartsPerSlide = 1
    if (width >= 1920) {
      newChartsPerSlide = aspectRatio > 2.5 ? 6 : aspectRatio > 2.0 ? 4 : 3
    } else if (width >= 1600) {
      newChartsPerSlide = aspectRatio > 2.2 ? 4 : 3
    } else if (width >= 1400) {
      newChartsPerSlide = aspectRatio > 2.0 ? 3 : 2
    } else if (width >= 1200) {
      newChartsPerSlide = aspectRatio > 1.8 ? 2 : 1
    } else if (width >= 1024) {
      newChartsPerSlide = aspectRatio > 1.6 ? 2 : 1
    } else {
      newChartsPerSlide = 1
    }

    setChartsPerSlide(newChartsPerSlide)
  }, [])

  const createSlides = useCallback((charts: DataFile[], perSlide: number): ChartSlide[] => {
    if (charts.length === 0) return []

    const slides: ChartSlide[] = []
    for (let i = 0; i < charts.length; i += perSlide) {
      const slideCharts = charts.slice(i, i + perSlide)
      slides.push({
        charts: slideCharts,
        slideIndex: Math.floor(i / perSlide),
      })
    }

    return slides
  }, [])

  const handleDashboardChange = useCallback((dashboard: Dashboard) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    setCurrentDashboard(dashboard)
    setIsLoading(true)
    setError(null)
    setCurrentSlideIndex(0)
    setRetryCount(0)
  }, [])

  const loadDashboardById = useCallback(
    async (id: string) => {
      try {
        const response = await ApiClient.get(`/api/internal/dashboards/${id}`, { tenantId })

        if (response.ok) {
          try {
            const dashboard = await response.json()
            if (dashboard && dashboard.title && !dashboard.error) {
              setCurrentDashboard(dashboard)
            }
          } catch (jsonError) {
            console.error("Failed to parse dashboard JSON:", jsonError)
          }
        }
      } catch (error) {
        console.error("Failed to load dashboard:", error)
      }
    },
    [tenantId],
  )

  const refreshData = useCallback(
    async (useCache = true) => {
      const activeDashboardId = dashboardId || currentDashboard?.id

      if (!activeDashboardId) {
        return
      }

      const cacheKey = `${tenantId}-${activeDashboardId}`
      const cached = dataCache.get(cacheKey)
      const now = Date.now()

      if (useCache && cached && now - cached.timestamp < settings.cacheDuration) {
        const sortedData = cached.data.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
        setDataFiles(sortedData)
        setIsLoading(false)
        return
      }

      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }

      abortControllerRef.current = new AbortController()
      setError(null)

      try {
        const response = await ApiClient.get(`/api/internal/data-files?dashboardId=${activeDashboardId}`, {
          signal: abortControllerRef.current.signal,
          tenantId,
        })

        if (!response.ok) {
          let errorText = `HTTP ${response.status}`
          try {
            const errorData = await response.json()
            errorText = errorData.error || errorText
          } catch (textError) {
            // Silent error handling
          }
          throw new Error(errorText)
        }

        let newData
        try {
          newData = await response.json()
        } catch (jsonError) {
          throw new Error("Invalid response format")
        }

        const files = Array.isArray(newData) ? newData : []
        const sortedFiles = files.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))

        dataCache.set(cacheKey, { data: sortedFiles, timestamp: now })

        setDataFiles(sortedFiles)
        setRetryCount(0)
      } catch (error: any) {
        if (error.name === "AbortError") {
          return
        }

        setError(error.message || "Failed to load dashboard data")

        if (retryCount < settings.maxRetryAttempts) {
          const delay = Math.pow(2, retryCount) * 1000
          setTimeout(() => {
            setRetryCount((prev) => prev + 1)
            refreshData(false)
          }, delay)
        } else {
          toast({
            title: "Connection Error",
            description: "Failed to load dashboard data after multiple attempts",
            variant: "destructive",
          })
        }
      } finally {
        setIsLoading(false)
      }
    },
    [dashboardId, currentDashboard, retryCount, toast, tenantId, settings.cacheDuration, settings.maxRetryAttempts],
  )

  const startSlideshow = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }

    if (slides.length > 1) {
      intervalRef.current = setInterval(() => {
        if (!isPaused) {
          setCurrentSlideIndex((prev) => {
            const nextIndex = prev + 1
            return nextIndex >= slides.length ? 0 : nextIndex
          })
        }
      }, settings.slideDuration)
    }
  }, [slides.length, isPaused, settings.slideDuration])

  const startDataRefresh = useCallback(() => {
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current)
    }

    refreshIntervalRef.current = setInterval(() => {
      if (!isPaused && (dashboardId || currentDashboard)) {
        refreshData(true)
      }
    }, settings.dataRefreshInterval)
  }, [dashboardId, currentDashboard, isPaused, refreshData, settings.dataRefreshInterval])

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

  const exitTVMode = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current)
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    router.push(`/${tenantId}/dashboard`)
  }, [router, tenantId])

  const showControlsTemporarily = useCallback(() => {
    setShowControls(true)

    if (hideControlsTimeoutRef.current) {
      clearTimeout(hideControlsTimeoutRef.current)
    }

    hideControlsTimeoutRef.current = setTimeout(() => {
      setShowControls(false)
    }, settings.controlsHideTimeout)
  }, [settings.controlsHideTimeout])

  const goToNextSlide = useCallback(() => {
    setCurrentSlideIndex((prev) => {
      const nextIndex = prev + 1
      return nextIndex >= slides.length ? 0 : nextIndex
    })
    showControlsTemporarily()
  }, [slides.length, showControlsTemporarily])

  const goToPreviousSlide = useCallback(() => {
    setCurrentSlideIndex((prev) => {
      const prevIndex = prev - 1
      return prevIndex < 0 ? slides.length - 1 : prevIndex
    })
    showControlsTemporarily()
  }, [slides.length, showControlsTemporarily])

  const handleSettingsChange = useCallback(
    (newSettings: TVModeSettings) => {
      setSettings(newSettings)
      if (slides.length > 1) {
        startSlideshow()
      }
      if (dashboardId || currentDashboard) {
        startDataRefresh()
      }
    },
    [slides.length, dashboardId, currentDashboard, startSlideshow, startDataRefresh],
  )

  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        exitTVMode()
      } else if (event.key === " ") {
        event.preventDefault()
        setIsPaused((prev) => !prev)
        showControlsTemporarily()
      } else if (event.key === "ArrowRight") {
        event.preventDefault()
        goToNextSlide()
      } else if (event.key === "ArrowLeft") {
        event.preventDefault()
        goToPreviousSlide()
      }
    }

    const handleMouseMove = () => {
      showControlsTemporarily()
    }

    const handleClick = () => {
      showControlsTemporarily()
    }

    window.addEventListener("keydown", handleKeyPress)
    window.addEventListener("mousemove", handleMouseMove)
    window.addEventListener("click", handleClick)

    return () => {
      window.removeEventListener("keydown", handleKeyPress)
      window.removeEventListener("mousemove", handleMouseMove)
      window.removeEventListener("click", handleClick)
    }
  }, [exitTVMode, goToNextSlide, goToPreviousSlide, showControlsTemporarily])

  useEffect(() => {
    const handleResize = () => {
      updateChartsPerSlide()
    }

    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [updateChartsPerSlide])

  useEffect(() => {
    if (dashboardId) {
      setCurrentDashboard({ id: dashboardId, title: "Loading...", created_at: "", updated_at: "" })
      loadDashboardById(dashboardId)
    }
  }, [dashboardId, loadDashboardById])

  useEffect(() => {
    const newSlides = createSlides(dataFiles, chartsPerSlide)
    setSlides(newSlides)
    setCurrentSlideIndex((prev) => (prev >= newSlides.length ? 0 : prev))
  }, [dataFiles, chartsPerSlide, createSlides])

  useEffect(() => {
    if (slides.length > 0) {
      startSlideshow()
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [slides, startSlideshow])

  useEffect(() => {
    if (dashboardId || currentDashboard) {
      refreshData(true)
      startDataRefresh()
    }

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current)
      }
    }
  }, [dashboardId, currentDashboard, refreshData, startDataRefresh])

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current)
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
      if (hideControlsTimeoutRef.current) {
        clearTimeout(hideControlsTimeoutRef.current)
      }
    }
  }, [])

  if (isLoading && currentDashboard) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <span className="text-muted-foreground">Loading TV Mode...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center text-center p-6">
            <AlertCircle className="h-12 w-12 text-destructive mb-4" />
            <h3 className="text-lg font-semibold mb-2">Connection Error</h3>
            <p className="text-muted-foreground mb-4">{error}</p>
            <div className="flex gap-2">
              <Button onClick={() => refreshData(false)} variant="outline">
                Try Again
              </Button>
              <Button onClick={exitTVMode}>Exit</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!currentDashboard) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <Tv className="h-8 w-8 text-primary" />
              <h1 className="text-3xl font-bold">TV Mode</h1>
            </div>
            <Button onClick={exitTVMode} variant="outline" size="sm">
              <X className="h-4 w-4 mr-2" />
              Exit
            </Button>
          </div>

          <DashboardSwitcher
            tenantId={tenantId}
            onDashboardChange={handleDashboardChange}
            currentDashboard={currentDashboard}
          />

          <div className="flex flex-col items-center justify-center py-16">
            <Tv className="h-16 w-16 text-muted-foreground mb-4" />
            <h2 className="text-2xl font-semibold mb-2">Select a Dashboard</h2>
            <p className="text-muted-foreground text-center max-w-md">
              Choose a dashboard to start the TV mode slideshow.
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (dataFiles.length === 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center text-center p-6">
            <Tv className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Charts Available</h3>
            <p className="text-muted-foreground mb-4">This dashboard doesn't have any charts to display in TV mode.</p>
            <Button onClick={exitTVMode}>Exit</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const currentSlide = slides[currentSlideIndex]

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <AnimatePresence>
        {showControls && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute top-4 right-4 z-50 flex gap-2"
          >
            <Button
              onClick={() => setShowSettings(true)}
              variant="secondary"
              size="sm"
              className="bg-background/80 backdrop-blur-sm hover:bg-background/90 border border-border/50"
            >
              <Settings className="h-4 w-4" />
            </Button>
            <Button
              onClick={exitTVMode}
              variant="secondary"
              size="sm"
              className="bg-background/80 backdrop-blur-sm hover:bg-background/90 border border-border/50"
            >
              <X className="h-4 w-4 mr-1" />
              Exit
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showControls && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute top-4 left-4 z-50"
          >
            <div className="bg-background/80 backdrop-blur-sm rounded-lg px-3 py-2 text-sm text-muted-foreground">
              {currentSlideIndex + 1} / {slides.length}
              {isPaused && <span className="ml-2 text-yellow-600">⏸ Paused</span>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-50">
        <div className="bg-background/80 backdrop-blur-sm rounded-lg px-4 py-2 text-center">
          <h1 className="text-lg font-semibold">{dashboardTitle}</h1>
          <p className="text-sm text-muted-foreground">
            {currentDashboard?.title && currentDashboard.title !== "Loading..."
              ? currentDashboard.title
              : dashboardId
                ? "Loading dashboard name..."
                : "No dashboard selected"}
          </p>
        </div>
      </div>

      <div className="min-h-screen flex items-center justify-center p-2 sm:p-4 md:p-6">
        <AnimatePresence mode="wait">
          {currentSlide && (
            <motion.div
              key={currentSlideIndex}
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -100 }}
              transition={{ duration: settings.animationDuration, ease: settings.animationType }}
              className="w-full"
            >
              <div
                className={`grid gap-3 sm:gap-4 md:gap-6 ${
                  chartsPerSlide === 1
                    ? "grid-cols-1"
                    : chartsPerSlide === 2
                      ? "grid-cols-1 lg:grid-cols-2"
                      : chartsPerSlide === 3
                        ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
                        : chartsPerSlide === 4
                          ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                          : chartsPerSlide === 6
                            ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6"
                            : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                }`}
              >
                {currentSlide.charts.map((file) => {
                  const chartData = processChartData(file.data, file.field_order)

                  return (
                    <Card key={file.id} className="h-full flex flex-col">
                      <CardHeader className="pb-2 sm:pb-4 flex-shrink-0">
                        <CardTitle className="text-lg sm:text-xl font-semibold capitalize truncate">
                          {file.type}
                        </CardTitle>
                        <CardDescription className="text-xs sm:text-sm">
                          Updated {formatRelativeTime(file.updated_at)} • {chartData.length} points
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="flex-1 flex flex-col min-h-0">
                        {chartData.length === 0 ? (
                          <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
                            No chart data available
                          </div>
                        ) : (
                          <div
                            className="flex-1 min-h-0"
                            style={{
                              minHeight:
                                chartsPerSlide === 1
                                  ? `${settings.chartMinHeight + 100}px`
                                  : `${settings.chartMinHeight}px`,
                              maxHeight:
                                chartsPerSlide === 1
                                  ? `${settings.chartMaxHeight + 100}px`
                                  : chartsPerSlide >= 4
                                    ? `${settings.chartMinHeight + 100}px`
                                    : `${settings.chartMaxHeight}px`,
                            }}
                          >
                            <DataChart
                              data={chartData}
                              title={file.type}
                              chartType={file.chart_type || "line"}
                              fieldOrder={file.field_order}
                              isAuthenticated={false}
                            />
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {showControls && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute left-4 top-1/2 transform -translate-y-1/2 z-50"
          >
            <Button
              onClick={goToPreviousSlide}
              variant="secondary"
              size="sm"
              className="bg-background/80 backdrop-blur-sm hover:bg-background/90 border border-border/50"
              disabled={slides.length <= 1}
            >
              ←
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showControls && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute right-4 top-1/2 transform -translate-y-1/2 z-50"
          >
            <Button
              onClick={goToNextSlide}
              variant="secondary"
              size="sm"
              className="bg-background/80 backdrop-blur-sm hover:bg-background/90 border border-border/50"
              disabled={slides.length <= 1}
            >
              →
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-50">
        <div className="flex gap-2">
          {slides.map((_, index) => (
            <div
              key={index}
              className={`w-2 h-2 rounded-full transition-colors ${
                index === currentSlideIndex ? "bg-primary" : "bg-muted"
              }`}
            />
          ))}
        </div>
      </div>

      <AnimatePresence>
        {showControls && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute bottom-4 right-4 z-50"
          >
            <div className="bg-background/80 backdrop-blur-sm rounded-lg px-3 py-2 text-xs text-muted-foreground">
              Press ESC to exit • SPACE to pause • ← → to navigate
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <TVModeSettingsPanel
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        settings={settings}
        onSettingsChange={handleSettingsChange}
      />
    </div>
  )
}
