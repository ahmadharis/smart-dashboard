"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Settings, X } from "lucide-react"
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

  useEffect(() => {
    setLocalSettings(settings)
  }, [settings])

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
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-2xl max-h-[90vh] overflow-y-auto"
          >
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    TV Mode Settings
                  </CardTitle>
                  <CardDescription>Customize the TV mode experience with timing and animation options.</CardDescription>
                </div>
                <Button variant="ghost" size="sm" onClick={onClose}>
                  <X className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Timing Settings */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Timing Settings</h3>

                  <div className="space-y-2">
                    <Label htmlFor="slideDuration">Slide Duration (seconds)</Label>
                    <div className="flex items-center space-x-4">
                      <Slider
                        id="slideDuration"
                        min={3}
                        max={60}
                        step={1}
                        value={[localSettings.slideDuration / 1000]}
                        onValueChange={([value]) => updateSetting("slideDuration", value * 1000)}
                        className="flex-1"
                      />
                      <span className="w-12 text-sm text-muted-foreground">{localSettings.slideDuration / 1000}s</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="dataRefresh">Data Refresh Interval (seconds)</Label>
                    <div className="flex items-center space-x-4">
                      <Slider
                        id="dataRefresh"
                        min={10}
                        max={300}
                        step={5}
                        value={[localSettings.dataRefreshInterval / 1000]}
                        onValueChange={([value]) => updateSetting("dataRefreshInterval", value * 1000)}
                        className="flex-1"
                      />
                      <span className="w-12 text-sm text-muted-foreground">
                        {localSettings.dataRefreshInterval / 1000}s
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="controlsHide">Controls Hide Timeout (seconds)</Label>
                    <div className="flex items-center space-x-4">
                      <Slider
                        id="controlsHide"
                        min={1}
                        max={10}
                        step={0.5}
                        value={[localSettings.controlsHideTimeout / 1000]}
                        onValueChange={([value]) => updateSetting("controlsHideTimeout", value * 1000)}
                        className="flex-1"
                      />
                      <span className="w-12 text-sm text-muted-foreground">
                        {localSettings.controlsHideTimeout / 1000}s
                      </span>
                    </div>
                  </div>
                </div>

                {/* Animation Settings */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Animation Settings</h3>

                  <div className="space-y-2">
                    <Label htmlFor="animationDuration">Animation Duration (seconds)</Label>
                    <div className="flex items-center space-x-4">
                      <Slider
                        id="animationDuration"
                        min={0.1}
                        max={2}
                        step={0.1}
                        value={[localSettings.animationDuration]}
                        onValueChange={([value]) => updateSetting("animationDuration", value)}
                        className="flex-1"
                      />
                      <span className="w-12 text-sm text-muted-foreground">{localSettings.animationDuration}s</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="animationType">Animation Type</Label>
                    <Select
                      value={localSettings.animationType}
                      onValueChange={(value: TVModeSettings["animationType"]) => updateSetting("animationType", value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="easeInOut">Ease In Out (Smooth)</SelectItem>
                        <SelectItem value="easeIn">Ease In (Slow Start)</SelectItem>
                        <SelectItem value="easeOut">Ease Out (Slow End)</SelectItem>
                        <SelectItem value="linear">Linear (Constant Speed)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-between pt-4 border-t">
                  <Button variant="outline" onClick={handleReset}>
                    Reset to Defaults
                  </Button>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={onClose}>
                      Cancel
                    </Button>
                    <Button onClick={handleSave}>Save Settings</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
