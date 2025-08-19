"use client"

import type React from "react"
import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import {
  Trash2,
  Plus,
  Upload,
  FileText,
  AlertTriangle,
  Edit2,
  Check,
  X,
  FolderOpen,
  Settings,
  Copy,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

import { ApiClient } from "@/lib/api-client"
import { formatRelativeTime } from "@/lib/time-utils"

interface DataFile {
  id: string
  name: string
  type: string
  data: any[]
  created_at: string
  updated_at: string
  dashboard_id?: string
}

interface Dashboard {
  id: string
  title: string
  created_at: string
  updated_at: string
  sort_order?: number
}

interface Setting {
  tenant_id: string
  key: string
  value: string
  created_at: string
  updated_at: string
}

interface FileManagementClientProps {
  tenantId: string
}

export function FileManagementClient({ tenantId }: FileManagementClientProps) {
  const [dataFiles, setDataFiles] = useState<DataFile[]>([])
  const [dashboards, setDashboards] = useState<Dashboard[]>([])
  const [settings, setSettings] = useState<Setting[]>([])
  const [xmlInput, setXmlInput] = useState("")
  const [selectedType, setSelectedType] = useState("")
  const [customType, setCustomType] = useState("")
  const [selectedDashboard, setSelectedDashboard] = useState("")
  const [newDashboardTitle, setNewDashboardTitle] = useState("")
  const [filterDashboard, setFilterDashboard] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [editingDashboard, setEditingDashboard] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState("")
  const [newDashboardName, setNewDashboardName] = useState("")
  const [isCreatingDashboard, setIsCreatingDashboard] = useState(false)
  const [isReordering, setIsReordering] = useState(false)
  const [draggedDashboard, setDraggedDashboard] = useState<string | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)

  // Settings state
  const [newSettingKey, setNewSettingKey] = useState("")
  const [newSettingValue, setNewSettingValue] = useState("")
  const [editingSetting, setEditingSetting] = useState<string | null>(null)
  const [editingSettingValue, setEditingSettingValue] = useState("")
  const [isCreatingSetting, setIsCreatingSetting] = useState(false)

  const { toast } = useToast()

  const [activeTab, setActiveTab] = useState("dashboards")

  const loadDashboards = useCallback(async () => {
    try {
      const response = await ApiClient.get(`/api/internal/dashboards`, { tenantId })
      if (response.ok) {
        const dashboardData = await response.json()
        const sortedDashboards = Array.isArray(dashboardData)
          ? dashboardData.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
          : []
        setDashboards(sortedDashboards)
      } else {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }))
        console.error("Failed to load dashboards:", errorData)
        toast({
          title: "Error",
          description: `Failed to load dashboards: ${errorData.error || "Unknown error"}`,
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error loading dashboards:", error)
      toast({
        title: "Error",
        description: "Failed to load dashboards. Please check your connection and try again.",
        variant: "destructive",
      })
    }
  }, [tenantId, toast])

  const loadDataFiles = useCallback(async () => {
    setIsLoading(true)
    try {
      const response = await ApiClient.get(`/api/internal/data-files`, { tenantId })
      if (response.ok) {
        const fileData = await response.json()
        const sortedFiles = Array.isArray(fileData)
          ? fileData.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
          : []
        setDataFiles(sortedFiles)
      } else {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }))
        console.error("Failed to load data files:", errorData)
        toast({
          title: "Error",
          description: `Failed to load data files: ${errorData.error || "Unknown error"}`,
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error loading data files:", error)
      toast({
        title: "Error",
        description: "Failed to load data files. Please check your connection and try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }, [tenantId, toast])

  const loadSettings = useCallback(async () => {
    try {
      const response = await ApiClient.get(`/api/internal/settings`, { tenantId })
      if (response.ok) {
        const settingsData = await response.json()
        setSettings(Array.isArray(settingsData) ? settingsData : [])
      } else {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }))
        console.error("Failed to load settings:", errorData)
        toast({
          title: "Error",
          description: `Failed to load settings: ${errorData.error || "Unknown error"}`,
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error loading settings:", error)
      toast({
        title: "Error",
        description: "Failed to load settings. Please check your connection and try again.",
        variant: "destructive",
      })
    }
  }, [tenantId, toast])

  useEffect(() => {
    loadDashboards()
    loadDataFiles()
    loadSettings()
  }, [loadDashboards, loadDataFiles, loadSettings])

  const safeDataFiles = Array.isArray(dataFiles) ? dataFiles : []
  const existingTypes = Array.from(new Set(safeDataFiles.map((file) => file.type)))
  const commonTypes = ["Cases", "Pallets", "Trailers", "Orders", "Shipments", "Inventory"]
  const allTypes = Array.from(new Set([...existingTypes, ...commonTypes]))

  const getDashboardTitle = (dashboardId: string) => {
    const dashboard = dashboards.find((d) => d.id === dashboardId)
    return dashboard ? dashboard.title : "Unknown Dashboard"
  }

  const handleDeleteFile = async (fileId: string, fileName: string) => {
    try {
      const response = await ApiClient.delete(`/api/internal/data-files/${fileId}`, { tenantId })

      if (response.ok) {
        await loadDataFiles()
        toast({
          title: "File deleted",
          description: `${fileName} has been successfully removed.`,
        })
      } else {
        const error = await response.json()
        throw new Error(error.error || "Failed to delete file")
      }
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to delete ${fileName}. Please try again.`,
        variant: "destructive",
      })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    console.log("[v0] Form submission started")

    if (!xmlInput.trim()) {
      console.log("[v0] Validation failed: No XML input")
      toast({
        title: "Error",
        description: "Please enter XML data",
        variant: "destructive",
      })
      return
    }

    if (selectedDashboard === "new" && !newDashboardTitle.trim()) {
      console.log("[v0] Validation failed: No dashboard title for new dashboard")
      toast({
        title: "Error",
        description: "Please enter a dashboard title",
        variant: "destructive",
      })
      return
    }

    const finalDataType = selectedType === "custom" ? customType.trim() : selectedType
    if (!finalDataType) {
      console.log("[v0] Validation failed: No data type selected")
      toast({
        title: "Error",
        description: "Please select or enter a data type",
        variant: "destructive",
      })
      return
    }

    console.log("[v0] Form validation passed, starting submission")
    setIsSubmitting(true)

    try {
      const formData = new FormData()
      formData.append("xml", xmlInput)
      formData.append("tenant_id", tenantId)
      formData.append("data_type", finalDataType)

      if (selectedDashboard) {
        formData.append("dashboard_id", selectedDashboard)
        if (selectedDashboard === "new" && newDashboardTitle.trim()) {
          formData.append("dashboard_title", newDashboardTitle.trim())
        }
      }

      console.log("[v0] Making API request to /api/internal/data-files")
      const response = await ApiClient.post("/api/internal/data-files", formData, { tenantId })
      console.log("[v0] API response received:", response.status, response.ok)

      if (response.ok) {
        const result = await response.json()
        console.log("[v0] API response data:", result)

        await loadDataFiles()
        await loadDashboards() // Refresh dashboards in case a new one was created

        // Reset form
        setXmlInput("")
        setSelectedDashboard("")
        setSelectedType("")
        setCustomType("")
        setNewDashboardTitle("")

        toast({
          title: "Success",
          description: result.message || "XML data uploaded successfully",
        })
      } else {
        const error = await response.json()
        console.log("[v0] API error response:", error)
        throw new Error(error.error || "Failed to upload XML data")
      }
    } catch (error) {
      console.log("[v0] Exception caught:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to upload XML data",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
      console.log("[v0] Form submission completed")
    }
  }

  const handleCreateDashboard = async () => {
    if (!newDashboardTitle.trim()) {
      toast({
        title: "Error",
        description: "Please enter a dashboard name.",
        variant: "destructive",
      })
      return
    }

    setIsCreatingDashboard(true)

    try {
      const response = await ApiClient.post(
        "/api/internal/dashboards",
        {
          title: newDashboardTitle.trim(),
          tenant_id: tenantId,
        },
        { tenantId },
      )

      if (response.ok) {
        await loadDashboards()
        setNewDashboardTitle("")
        toast({
          title: "Success",
          description: "Dashboard created successfully.",
        })
      } else {
        const error = await response.json()
        throw new Error(error.error || "Failed to create dashboard")
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create dashboard.",
        variant: "destructive",
      })
    } finally {
      setIsCreatingDashboard(false)
    }
  }

  const handleEditDashboard = (dashboard: Dashboard) => {
    setEditingDashboard(dashboard.id)
    setEditingTitle(dashboard.title)
  }

  const handleSaveEdit = async (dashboardId: string) => {
    if (!editingTitle.trim()) {
      toast({
        title: "Error",
        description: "Dashboard name cannot be empty.",
        variant: "destructive",
      })
      return
    }

    try {
      const response = await ApiClient.put(
        `/api/internal/dashboards/${dashboardId}`,
        { title: editingTitle.trim() },
        { tenantId },
      )

      if (response.ok) {
        await loadDashboards()
        setEditingDashboard(null)
        setEditingTitle("")
        toast({
          title: "Success",
          description: "Dashboard name updated successfully.",
        })
      } else {
        const error = await response.json()
        throw new Error(error.error || "Failed to update dashboard")
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update dashboard.",
        variant: "destructive",
      })
    }
  }

  const handleCancelEdit = () => {
    setEditingDashboard(null)
    setEditingTitle("")
  }

  const handleDeleteDashboard = async (dashboardId: string, dashboardTitle: string) => {
    try {
      const response = await ApiClient.delete(`/api/internal/dashboards/${dashboardId}`, { tenantId })

      if (response.ok) {
        await loadDashboards()
        await loadDataFiles() // Refresh data files as they may have been deleted
        toast({
          title: "Success",
          description: `Dashboard "${dashboardTitle}" and all associated data files have been deleted.`,
        })
      } else {
        const error = await response.json()
        throw new Error(error.error || "Failed to delete dashboard")
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete dashboard.",
        variant: "destructive",
      })
    }
  }

  const getFileCountForDashboard = (dashboardId: string) => {
    return safeDataFiles.filter((file) => file.dashboard_id === dashboardId).length
  }

  const formatDate = (dateString: string) => {
    return formatRelativeTime(dateString)
  }

  const formatTime = (dateString: string) => {
    // No longer needed as formatRelativeTime handles both date and time
    return ""
  }

  const filteredDataFiles =
    filterDashboard && filterDashboard !== "all-dashboards"
      ? safeDataFiles.filter((file) => file.dashboard_id === filterDashboard)
      : safeDataFiles

  const handleDragStart = (e: React.DragEvent, dashboardId: string, index: number) => {
    setDraggedDashboard(dashboardId)
    e.dataTransfer.effectAllowed = "move"
    e.dataTransfer.setData("text/html", dashboardId)

    // Add some visual feedback
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = "0.5"
    }
  }

  const handleDragEnd = (e: React.DragEvent) => {
    setDraggedDashboard(null)
    setDragOverIndex(null)

    // Reset visual feedback
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = "1"
    }
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
    setDragOverIndex(index)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    // Only clear if we're leaving the entire drop zone
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDragOverIndex(null)
    }
  }

  const handleDrop = async (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault()
    setDragOverIndex(null)

    if (!draggedDashboard) return

    const dragIndex = dashboards.findIndex((d) => d.id === draggedDashboard)
    if (dragIndex === -1 || dragIndex === dropIndex) return

    setIsReordering(true)

    try {
      // Create new array with moved item
      const newDashboards = [...dashboards]
      const [movedDashboard] = newDashboards.splice(dragIndex, 1)
      newDashboards.splice(dropIndex, 0, movedDashboard)

      // Update sort_order values
      const updates = newDashboards.map((dashboard, index) => ({
        id: dashboard.id,
        sort_order: index,
      }))

      // Send batch update to API
      const response = await ApiClient.patch("/api/internal/dashboards/reorder", { updates }, { tenantId })

      if (response.ok) {
        // Update local state
        const updatedDashboards = newDashboards.map((dashboard, index) => ({
          ...dashboard,
          sort_order: index,
        }))
        setDashboards(updatedDashboards)

        toast({
          title: "Success",
          description: "Dashboard order updated successfully.",
        })
      } else {
        throw new Error("Failed to update dashboard order")
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update dashboard order. Please try again.",
        variant: "destructive",
      })
      // Reload dashboards to reset state
      await loadDashboards()
    } finally {
      setIsReordering(false)
      setDraggedDashboard(null)
    }
  }

  const handleMoveDashboard = useCallback(
    async (dashboardId: string, direction: "up" | "down") => {
      const currentIndex = dashboards.findIndex((d) => d.id === dashboardId)
      if (currentIndex === -1) return

      const newIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1
      if (newIndex < 0 || newIndex >= dashboards.length) return

      setIsReordering(true)

      try {
        const newDashboards = [...dashboards]
        const [movedDashboard] = newDashboards.splice(currentIndex, 1)
        newDashboards.splice(newIndex, 0, movedDashboard)

        const updates = newDashboards.map((dashboard, index) => ({
          id: dashboard.id,
          sort_order: index,
        }))

        const response = await ApiClient.patch("/api/internal/dashboards/reorder", { updates }, { tenantId })

        if (response.ok) {
          // Update local state
          const updatedDashboards = newDashboards.map((dashboard, index) => ({
            ...dashboard,
            sort_order: index,
          }))
          setDashboards(updatedDashboards)

          toast({
            title: "Success",
            description: "Dashboard order updated successfully.",
          })
        } else {
          throw new Error("Failed to update dashboard order")
        }
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to update dashboard order. Please try again.",
          variant: "destructive",
        })
        await loadDashboards()
      } finally {
        setIsReordering(false)
      }
    },
    [dashboards, toast, loadDashboards, tenantId],
  )

  // Settings functions
  const handleCreateSetting = async () => {
    if (!newSettingKey.trim() || !newSettingValue.trim()) {
      toast({
        title: "Error",
        description: "Please enter both key and value.",
        variant: "destructive",
      })
      return
    }

    setIsCreatingSetting(true)

    try {
      const response = await ApiClient.post(
        "/api/internal/settings",
        {
          key: newSettingKey.trim(),
          value: newSettingValue.trim(),
          tenant_id: tenantId,
        },
        { tenantId },
      )

      if (response.ok) {
        await loadSettings()
        setNewSettingKey("")
        setNewSettingValue("")
        toast({
          title: "Success",
          description: "Setting created successfully.",
        })
      } else {
        const error = await response.json()
        throw new Error(error.error || "Failed to create setting")
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create setting.",
        variant: "destructive",
      })
    } finally {
      setIsCreatingSetting(false)
    }
  }

  const handleEditSetting = (setting: Setting) => {
    setEditingSetting(setting.key)
    setEditingSettingValue(setting.value)
  }

  const handleSaveSettingEdit = async (key: string) => {
    if (!editingSettingValue.trim()) {
      toast({
        title: "Error",
        description: "Setting value cannot be empty.",
        variant: "destructive",
      })
      return
    }

    try {
      const response = await ApiClient.patch(
        `/api/internal/settings/${encodeURIComponent(key)}`,
        { value: editingSettingValue.trim() },
        { tenantId },
      )

      if (response.ok) {
        await loadSettings()
        setEditingSetting(null)
        setEditingSettingValue("")
        toast({
          title: "Success",
          description: "Setting updated successfully.",
        })
      } else {
        const error = await response.json()
        throw new Error(error.error || "Failed to update setting")
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update setting.",
        variant: "destructive",
      })
    }
  }

  const handleCancelSettingEdit = () => {
    setEditingSetting(null)
    setEditingSettingValue("")
  }

  const handleDeleteSetting = async (key: string) => {
    try {
      const response = await ApiClient.delete(`/api/internal/settings/${encodeURIComponent(key)}`, {
        tenantId,
      })

      if (response.ok) {
        await loadSettings()
        toast({
          title: "Success",
          description: `Setting "${key}" has been deleted.`,
        })
      } else {
        const error = await response.json()
        throw new Error(error.error || "Failed to delete setting")
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete setting.",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="space-y-6">
        <div className="border-b border-border">
          <nav className="flex space-x-8" aria-label="Tabs">
            <button
              onClick={() => setActiveTab("dashboards")}
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === "dashboards"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground"
              }`}
            >
              <div className="flex items-center gap-2">
                <FolderOpen className="h-4 w-4" />
                Dashboard
              </div>
            </button>
            <button
              onClick={() => setActiveTab("data-files")}
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === "data-files"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground"
              }`}
            >
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Data Files
              </div>
            </button>
            <button
              onClick={() => setActiveTab("settings")}
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === "settings"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground"
              }`}
            >
              <div className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Settings
              </div>
            </button>
          </nav>
        </div>

        {/* Dashboard Tab */}
        {activeTab === "dashboards" && (
          <div className="max-w-2xl">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FolderOpen className="h-5 w-5" />
                  Dashboard Management
                </CardTitle>
                <CardDescription>
                  Create, edit, and manage your dashboards. Drag and drop to reorder dashboards. Deleting a dashboard
                  will remove all associated data files.
                </CardDescription>
              </CardHeader>

              <CardContent className="border-b">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium">Create New Dashboard</h3>
                  </div>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Dashboard title"
                      value={newDashboardTitle}
                      onChange={(e) => setNewDashboardTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && newDashboardTitle.trim()) {
                          handleCreateDashboard()
                        }
                      }}
                    />
                    <Button onClick={handleCreateDashboard} disabled={!newDashboardTitle.trim() || isCreatingDashboard}>
                      {isCreatingDashboard ? "Creating..." : "Create"}
                    </Button>
                  </div>
                </div>

                <div className="space-y-4 mt-8">
                  <h3 className="font-medium">Existing Dashboards</h3>
                  {dashboards.length === 0 ? (
                    <div className="text-center py-6">
                      <FolderOpen className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">No dashboards found</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {dashboards.map((dashboard, index) => (
                        <div
                          key={dashboard.id}
                          draggable={!isReordering && editingDashboard !== dashboard.id}
                          onDragStart={(e) => handleDragStart(e, dashboard.id, index)}
                          onDragEnd={handleDragEnd}
                          onDragOver={(e) => handleDragOver(e, index)}
                          onDragLeave={handleDragLeave}
                          onDrop={(e) => handleDrop(e, index)}
                          className={`flex items-center gap-3 p-3 border rounded-lg transition-all duration-200 ${
                            dragOverIndex === index ? "border-primary bg-primary/5 scale-105" : "hover:bg-muted/50"
                          } ${draggedDashboard === dashboard.id ? "opacity-50" : ""} ${
                            !isReordering && editingDashboard !== dashboard.id
                              ? "cursor-grab active:cursor-grabbing"
                              : ""
                          }`}
                        >
                          <div className="flex items-center justify-center w-8 h-8 text-muted-foreground">
                            <div className="flex flex-col gap-0.5">
                              <div className="w-1 h-1 bg-current rounded-full"></div>
                              <div className="w-1 h-1 bg-current rounded-full"></div>
                              <div className="w-1 h-1 bg-current rounded-full"></div>
                              <div className="w-1 h-1 bg-current rounded-full"></div>
                              <div className="w-1 h-1 bg-current rounded-full"></div>
                              <div className="w-1 h-1 bg-current rounded-full"></div>
                            </div>
                          </div>

                          <div className="flex-1 min-w-0">
                            {editingDashboard === dashboard.id ? (
                              <div className="flex items-center gap-2">
                                <Input
                                  value={editingTitle}
                                  onChange={(e) => setEditingTitle(e.target.value)}
                                  className="h-8"
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      handleSaveEdit(dashboard.id)
                                    } else if (e.key === "Escape") {
                                      handleCancelEdit()
                                    }
                                  }}
                                />
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleSaveEdit(dashboard.id)}
                                  className="h-8 w-8 p-0"
                                >
                                  <Check className="h-4 w-4" />
                                </Button>
                                <Button size="sm" variant="ghost" onClick={handleCancelEdit} className="h-8 w-8 p-0">
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            ) : (
                              <div>
                                <div className="flex items-center gap-2 mb-1">
                                  <h4 className="font-medium truncate">{dashboard.title}</h4>
                                  <Badge variant="secondary" className="text-xs">
                                    {getFileCountForDashboard(dashboard.id)} files
                                  </Badge>
                                </div>
                                <div className="flex items-center gap-2 mb-1">
                                  <code className="text-xs text-muted-foreground font-mono bg-muted px-2 py-1 rounded">
                                    {dashboard.id}
                                  </code>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => {
                                      navigator.clipboard
                                        .writeText(dashboard.id)
                                        .then(() => {
                                          toast({
                                            title: "Copied!",
                                            description: "Dashboard GUID copied to clipboard.",
                                          })
                                        })
                                        .catch(() => {
                                          toast({
                                            title: "Error",
                                            description: "Failed to copy GUID to clipboard.",
                                            variant: "destructive",
                                          })
                                        })
                                    }}
                                    className="h-6 w-6 p-0"
                                  >
                                    <Copy className="h-3 w-3" />
                                  </Button>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  Created: {formatDate(dashboard.created_at)}
                                </p>
                              </div>
                            )}
                          </div>

                          {editingDashboard !== dashboard.id && (
                            <div className="flex items-center gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleEditDashboard(dashboard)}
                                className="h-8 w-8 p-0"
                                disabled={isReordering}
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>

                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                                onClick={() => handleDeleteDashboard(dashboard.id, dashboard.title)}
                                disabled={isReordering}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Data Files Tab */}
        {activeTab === "data-files" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Existing Files Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Data Files
                  </CardTitle>
                  <CardDescription>Manage your current data files. Files are organized by dashboard.</CardDescription>
                  <div className="pt-4">
                    <Label htmlFor="filter-dashboard" className="text-sm">
                      Filter by Dashboard
                    </Label>
                    <Select value={filterDashboard || undefined} onValueChange={setFilterDashboard}>
                      <SelectTrigger className="w-full mt-1">
                        <SelectValue placeholder="All dashboards" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all-dashboards">All dashboards</SelectItem>
                        {dashboards.map((dashboard) => (
                          <SelectItem key={dashboard.id} value={dashboard.id}>
                            {dashboard.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">Loading files...</p>
                    </div>
                  ) : filteredDataFiles.length === 0 ? (
                    <div className="text-center py-8">
                      <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">
                        {filterDashboard ? "No data files found for selected dashboard" : "No data files found"}
                      </p>
                      <p className="text-sm text-muted-foreground">Add your first file using the form on the right.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {filteredDataFiles.map((file) => (
                        <div key={file.id} className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-medium capitalize">{file.type}</h3>
                              <Badge variant="secondary" className="text-xs">
                                {Array.isArray(file.data) ? file.data.length : 0} records
                              </Badge>
                              {file.dashboard_id && (
                                <Badge variant="outline" className="text-xs">
                                  {getDashboardTitle(file.dashboard_id)}
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">Last updated: {formatDate(file.updated_at)}</p>
                          </div>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle className="flex items-center gap-2">
                                  <AlertTriangle className="h-5 w-5 text-destructive" />
                                  Delete Data File
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete <strong>{file.name}</strong>? This action cannot be
                                  undone and will remove the file from your dashboard.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteFile(file.id, file.name || file.type)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Delete File
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Add New File Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Plus className="h-5 w-5" />
                    Add Data File
                  </CardTitle>
                  <CardDescription>
                    Paste XML data below to create a new data file or update an existing one.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="dashboard-select">Dashboard</Label>
                      <Select value={selectedDashboard || undefined} onValueChange={setSelectedDashboard}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select dashboard" />
                        </SelectTrigger>
                        <SelectContent>
                          {dashboards.map((dashboard) => (
                            <SelectItem key={dashboard.id} value={dashboard.id}>
                              {dashboard.title}
                            </SelectItem>
                          ))}
                          <SelectItem value="new">Create New Dashboard...</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {selectedDashboard === "new" && (
                      <div className="space-y-2">
                        <Label htmlFor="new-dashboard-title">New Dashboard Title</Label>
                        <Input
                          id="new-dashboard-title"
                          value={newDashboardTitle}
                          onChange={(e) => setNewDashboardTitle(e.target.value)}
                          placeholder="Enter dashboard title"
                        />
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label htmlFor="type-select">Data Type</Label>
                      <Select value={selectedType || undefined} onValueChange={setSelectedType}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select data type" />
                        </SelectTrigger>
                        <SelectContent>
                          {allTypes.map((type) => (
                            <SelectItem key={type} value={type}>
                              {type}
                            </SelectItem>
                          ))}
                          <SelectItem value="custom">Custom Type...</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {selectedType === "custom" && (
                      <div className="space-y-2">
                        <Label htmlFor="custom-type">Custom Type Name</Label>
                        <Input
                          id="custom-type"
                          value={customType}
                          onChange={(e) => setCustomType(e.target.value)}
                          placeholder="Enter custom type name"
                        />
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label htmlFor="xml-input">XML Data</Label>
                      <Textarea
                        id="xml-input"
                        value={xmlInput}
                        onChange={(e) => setXmlInput(e.target.value)}
                        placeholder={`<resultset columns="2" rows="2">
  <row number="1">
    <date>8/11/2023</date>
    <value>2</value>
  </row>
  <row number="2">
    <date>8/11/2024</date>
    <value>3</value>
  </row>
</resultset>`}
                        className="min-h-[200px] font-mono text-sm"
                      />
                    </div>

                    <Button type="button" onClick={handleSubmit} disabled={isSubmitting} className="w-full">
                      <Upload className="h-4 w-4 mr-2" />
                      {isSubmitting ? "Processing..." : "Add Data File"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === "settings" && (
          <div className="space-y-6">
            <div className="max-w-2xl">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    Settings Management
                  </CardTitle>
                  <CardDescription>
                    Manage tenant-specific settings. These settings are isolated to your current tenant.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Create New Setting */}
                  <div className="space-y-4">
                    <h3 className="font-medium">Create New Setting</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <Input
                        type="text"
                        placeholder="Setting key"
                        value={newSettingKey}
                        onChange={(e) => setNewSettingKey(e.target.value)}
                      />
                      <Input
                        type="text"
                        placeholder="Setting value"
                        value={newSettingValue}
                        onChange={(e) => setNewSettingValue(e.target.value)}
                      />
                    </div>
                    <Button
                      onClick={handleCreateSetting}
                      disabled={!newSettingKey.trim() || !newSettingValue.trim()}
                      className="w-fit"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Create Setting
                    </Button>
                  </div>

                  {/* Existing Settings */}
                  <div className="space-y-4">
                    <h3 className="font-medium">Existing Settings</h3>
                    {settings.length === 0 ? (
                      <div className="text-center py-6">
                        <Settings className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">No settings found</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {settings.map((setting) => (
                          <div key={setting.key} className="flex items-center gap-3 p-3 border rounded-lg">
                            <div className="flex-1 min-w-0">
                              {editingSetting === setting.key ? (
                                <div className="flex items-center gap-2">
                                  <div className="font-medium text-sm">{setting.key}:</div>
                                  <Input
                                    value={editingSettingValue}
                                    onChange={(e) => setEditingSettingValue(e.target.value)}
                                    className="h-8"
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") {
                                        handleSaveSettingEdit(setting.key)
                                      } else if (e.key === "Escape") {
                                        handleCancelSettingEdit()
                                      }
                                    }}
                                  />
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleSaveSettingEdit(setting.key)}
                                    className="h-8 w-8 p-0"
                                  >
                                    <Check className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={handleCancelSettingEdit}
                                    className="h-8 w-8 p-0"
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </div>
                              ) : (
                                <div>
                                  <div className="flex items-center gap-2 mb-1">
                                    <h4 className="font-medium text-sm">{setting.key}</h4>
                                    <Badge variant="secondary" className="text-xs">
                                      {setting.value}
                                    </Badge>
                                  </div>
                                  <p className="text-xs text-muted-foreground">
                                    Updated: {formatDate(setting.updated_at)}
                                  </p>
                                </div>
                              )}
                            </div>

                            {editingSetting !== setting.key && (
                              <div className="flex items-center gap-1">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleEditSetting(setting)}
                                  className="h-8 w-8 p-0"
                                >
                                  <Edit2 className="h-4 w-4" />
                                </Button>

                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle className="flex items-center gap-2">
                                        <AlertTriangle className="h-5 w-5 text-destructive" />
                                        Delete Setting
                                      </AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Are you sure you want to delete the setting <strong>"{setting.key}"</strong>?
                                        This action cannot be undone.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => handleDeleteSetting(setting.key)}
                                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                      >
                                        Delete Setting
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
