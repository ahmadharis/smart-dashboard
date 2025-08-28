"use client"

import { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Settings, X, Check, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"

export interface TVModeSettings {
  slideDuration: number // milliseconds
  dataRefreshInterval: number // milliseconds
  controlsHideTimeout: number // milliseconds
  animationDuration: number // seconds
  animationType: "easeInOut" | "easeIn" | "easeOut" | "linear"
  maxRetryAttempts: number
  cacheDuration: number // milliseconds
  chartMinHeight: number // pixels
  chartMaxHeight: number // pixels
}

export const DEFAULT_TV_SETTINGS: TVModeSettings = {
  slideDuration: 10000, // 10 seconds
  dataRefreshInterval: 30000, // 30 seconds
  controlsHideTimeout: 3000, // 3 seconds
  animationDuration: 0.5, // 0.5 seconds
  animationType: "easeInOut",
  maxRetryAttempts: 3,
  cacheDuration: 30000, // 30 seconds
  chartMinHeight: 200, // pixels
  chartMaxHeight: 400, // pixels
}

const STORAGE_KEY = "tv-mode-settings"

export function loadTVModeSettings(): TVModeSettings {
  if (typeof window === "undefined") return DEFAULT_TV_SETTINGS

  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      return { ...DEFAULT_TV_SETTINGS, ...parsed }
    }
  } catch (error) {
    console.error("Failed to load TV mode settings:", error)
  }

  return DEFAULT_TV_SETTINGS
}

export function saveTVModeSettings(settings: TVModeSettings): void {
  if (typeof window === "undefined") return

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  } catch (error) {
    console.error("Failed to save TV mode settings:", error)
  }
}

interface TVModeSettingsProps {
  isOpen: boolean
  onClose: () => void
  settings: TVModeSettings
  onSettingsChange: (settings: TVModeSettings) => void
}

export function TVModeSettingsPanel({ isOpen, onClose, settings, onSettingsChange }: TVModeSettingsProps) {
  const [localSettings, setLocalSettings] = useState<TVModeSettings>(settings)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setLocalSettings(settings)
  }, [settings])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return

      if (e.key === "Escape" || e.key === "ArrowLeft") {
        onClose()
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [isOpen, onClose])

  useEffect(() => {
    if (isOpen && panelRef.current) {
      const firstFocusable = panelRef.current.querySelector('button, [tabindex="0"]') as HTMLElement
      firstFocusable?.focus()
    }
  }, [isOpen])

  const handleSave = () => {
    onSettingsChange(localSettings)
    saveTVModeSettings(localSettings)
    onClose()
  }

  const handleReset = () => {
    setLocalSettings(DEFAULT_TV_SETTINGS)
  }

  const updateSetting = <K extends keyof TVModeSettings>(key: K, value: TVModeSettings[K]) => {
    setLocalSettings((prev) => ({ ...prev, [key]: value }))
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[100]"
            onClick={onClose}
          />

          <motion.div
            ref={panelRef}
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 h-full max-h-screen w-72 sm:w-80 lg:w-96 z-[101] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <Card className="flex-1 flex flex-col rounded-none border-l border-t-0 border-r-0 border-b-0 shadow-2xl max-h-full">
              <CardHeader className="flex-shrink-0 pb-4 border-b">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="flex items-center gap-2 text-base sm:text-lg mb-2">
                      <Settings className="h-4 w-4" />
                      TV Mode Settings
                    </CardTitle>
                    <CardDescription className="text-xs sm:text-sm">
                      Customize timing and animation options.
                    </CardDescription>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onClose}
                    className="ring-offset-background focus:ring-ring rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden h-8 w-8 ml-2"
                    tabIndex={0}
                  >
                    <X className="h-4 w-4" />
                    <span className="sr-only">Close</span>
                  </Button>
                </div>
                <div className="flex justify-start mt-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleReset}
                    className="h-8 text-xs px-3 text-muted-foreground hover:text-foreground focus:ring-2 focus:ring-primary"
                    title="Reset all settings to defaults"
                  >
                    <RotateCcw className="h-3 w-3 mr-1" />
                    Reset to Defaults
                  </Button>
                </div>
              </CardHeader>

              <div className="flex-1 overflow-hidden min-h-0">
                <CardContent className="h-full overflow-y-auto scrollbar-thin scrollbar-thumb-muted-foreground/20 scrollbar-track-transparent space-y-5 p-4">
                  <div className="space-y-3">
                    <h3 className="text-sm sm:text-base font-semibold">Timing Settings</h3>

                    <div className="space-y-2">
                      <Label htmlFor="slideDuration" className="text-xs sm:text-sm font-medium">
                        Slide Duration (seconds)
                      </Label>
                      <div className="flex items-center space-x-3">
                        <Slider
                          id="slideDuration"
                          min={3}
                          max={60}
                          step={1}
                          value={[localSettings.slideDuration / 1000]}
                          onValueChange={([value]) => updateSetting("slideDuration", value * 1000)}
                          className="flex-1"
                        />
                        <span className="w-12 text-xs sm:text-sm font-medium text-muted-foreground">
                          {localSettings.slideDuration / 1000}s
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="dataRefresh" className="text-xs sm:text-sm font-medium">
                        Data Refresh Interval (seconds)
                      </Label>
                      <div className="flex items-center space-x-3">
                        <Slider
                          id="dataRefresh"
                          min={10}
                          max={300}
                          step={5}
                          value={[localSettings.dataRefreshInterval / 1000]}
                          onValueChange={([value]) => updateSetting("dataRefreshInterval", value * 1000)}
                          className="flex-1"
                        />
                        <span className="w-12 text-xs sm:text-sm font-medium text-muted-foreground">
                          {localSettings.dataRefreshInterval / 1000}s
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="controlsHide" className="text-xs sm:text-sm font-medium">
                        Controls Hide Timeout (seconds)
                      </Label>
                      <div className="flex items-center space-x-3">
                        <Slider
                          id="controlsHide"
                          min={1}
                          max={10}
                          step={0.5}
                          value={[localSettings.controlsHideTimeout / 1000]}
                          onValueChange={([value]) => updateSetting("controlsHideTimeout", value * 1000)}
                          className="flex-1"
                        />
                        <span className="w-12 text-xs sm:text-sm font-medium text-muted-foreground">
                          {localSettings.controlsHideTimeout / 1000}s
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-border/50"></div>

                  <div className="space-y-3">
                    <h3 className="text-sm sm:text-base font-semibold">Animation Settings</h3>

                    <div className="space-y-2">
                      <Label htmlFor="animationDuration" className="text-xs sm:text-sm font-medium">
                        Animation Duration (seconds)
                      </Label>
                      <div className="flex items-center space-x-3">
                        <Slider
                          id="animationDuration"
                          min={0.1}
                          max={2}
                          step={0.1}
                          value={[localSettings.animationDuration]}
                          onValueChange={([value]) => updateSetting("animationDuration", value)}
                          className="flex-1"
                        />
                        <span className="w-12 text-xs sm:text-sm font-medium text-muted-foreground">
                          {localSettings.animationDuration}s
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="animationType" className="text-xs sm:text-sm font-medium">
                        Animation Type
                      </Label>
                      <Select
                        value={localSettings.animationType}
                        onValueChange={(value: TVModeSettings["animationType"]) =>
                          updateSetting("animationType", value)
                        }
                      >
                        <SelectTrigger className="h-9 sm:h-10 text-xs sm:text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="easeInOut" className="text-xs sm:text-sm py-2">
                            Ease In Out (Smooth)
                          </SelectItem>
                          <SelectItem value="easeIn" className="text-xs sm:text-sm py-2">
                            Ease In (Slow Start)
                          </SelectItem>
                          <SelectItem value="easeOut" className="text-xs sm:text-sm py-2">
                            Ease Out (Slow End)
                          </SelectItem>
                          <SelectItem value="linear" className="text-xs sm:text-sm py-2">
                            Linear (Constant Speed)
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </div>

              <div className="flex-shrink-0 p-4 border-t bg-background">
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={onClose}
                    className="flex-1 h-9 text-sm px-3 focus:ring-2 focus:ring-primary bg-transparent"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                  <Button onClick={handleSave} className="flex-1 h-9 text-sm px-3 focus:ring-2 focus:ring-primary">
                    <Check className="h-4 w-4 mr-2" />
                    Save Settings
                  </Button>
                </div>
              </div>
            </Card>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
