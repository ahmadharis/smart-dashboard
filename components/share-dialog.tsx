"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Copy,
  Eye,
  Globe,
  Lock,
  RefreshCw,
  Trash2,
  CalendarIcon,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { ApiClient } from "@/lib/api-client"
import { format } from "date-fns"

interface ShareDialogProps {
  isOpen: boolean
  onClose: () => void
  tenantId: string
  dashboardId: string
  dashboardTitle: string
  tenantApiKey: string
}

interface PublicShare {
  share_id: string
  share_token: string
  created_at: string
  updated_at: string
  expires_at: string | null
  view_count: number
  last_accessed_at: string | null
}

export function ShareDialog({
  isOpen,
  onClose,
  tenantId,
  dashboardId,
  dashboardTitle,
  tenantApiKey,
}: ShareDialogProps) {
  const [shareType, setShareType] = useState<"private" | "public">("private")
  const [publicShare, setPublicShare] = useState<PublicShare | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isPublicSharingEnabled, setIsPublicSharingEnabled] = useState(false)
  const [hasExpiration, setHasExpiration] = useState(false)
  const [expirationDate, setExpirationDate] = useState<Date>()
  const { toast } = useToast()

  useEffect(() => {
    if (isOpen) {
      checkPublicSharingStatus()
      fetchExistingShare()
    }
  }, [isOpen, dashboardId])

  const checkPublicSharingStatus = async () => {
    try {
      const response = await ApiClient.get(`/api/internal/settings`, { tenantId })
      if (response.ok) {
        const settings = await response.json()
        const publicSharingSetting = settings.find((s: any) => s.key === "allow_public_sharing")
        setIsPublicSharingEnabled(publicSharingSetting?.value === "true")
      }
    } catch (error) {
      console.error("Failed to check public sharing status:", error)
    }
  }

  const fetchExistingShare = async () => {
    try {
      const response = await ApiClient.get(`/api/internal/dashboards/${dashboardId}/share`, { tenantId })
      if (response.ok) {
        const data = await response.json()
        if (data.share) {
          setPublicShare(data.share)
          setShareType("public")
          if (data.share.expires_at) {
            setHasExpiration(true)
            setExpirationDate(new Date(data.share.expires_at))
          }
        }
      }
    } catch (error) {
      console.error("Failed to fetch existing share:", error)
    }
  }

  const createPublicShare = async () => {
    setIsLoading(true)
    try {
      const response = await ApiClient.post(
        `/api/internal/dashboards/${dashboardId}/share`,
        {
          expires_at: hasExpiration && expirationDate ? expirationDate.toISOString() : null,
        },
        { tenantId },
      )

      if (response.ok) {
        const data = await response.json()
        setPublicShare(data.share)
        toast({
          title: "Success",
          description: "Public share link created successfully",
        })
      } else {
        throw new Error("Failed to create public share")
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create public share",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const regenerateShare = async () => {
    setIsLoading(true)
    try {
      const response = await ApiClient.put(`/api/internal/dashboards/${dashboardId}/share/regenerate`, {}, { tenantId })

      if (response.ok) {
        const data = await response.json()
        setPublicShare(data.share)
        toast({
          title: "Success",
          description: "Share link regenerated successfully",
        })
      } else {
        throw new Error("Failed to regenerate share")
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to regenerate share",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const deleteShare = async () => {
    setIsLoading(true)
    try {
      const response = await ApiClient.delete(`/api/internal/dashboards/${dashboardId}/share`, { tenantId })

      if (response.ok) {
        setPublicShare(null)
        setShareType("private")
        setHasExpiration(false)
        setExpirationDate(undefined)
        toast({
          title: "Success",
          description: "Public share deleted successfully",
        })
      } else {
        throw new Error("Failed to delete share")
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete share",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast({
        title: "Copied!",
        description: `${label} copied to clipboard`,
      })
    } catch (error) {
      toast({
        title: "Copy failed",
        description: `Please copy manually: ${text}`,
        variant: "destructive",
      })
    }
  }

  const getPrivateUrl = () => {
    return `${window.location.origin}/${tenantId}/dashboard?id=${dashboardId}`
  }

  const getPublicUrl = () => {
    return publicShare ? `${window.location.origin}/shared/${publicShare.share_token}` : ""
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share Dashboard</DialogTitle>
          <DialogDescription>Share "{dashboardTitle}" with others using the options below.</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <RadioGroup value={shareType} onValueChange={(value) => setShareType(value as "private" | "public")}>
            {/* Private Sharing Option */}
            <div className="flex items-start space-x-3 p-3 rounded-lg border">
              <RadioGroupItem value="private" id="private" className="mt-1" />
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <Lock className="h-4 w-4 text-muted-foreground" />
                  <Label htmlFor="private" className="font-medium">
                    Private (Login Required)
                  </Label>
                </div>
                <p className="text-sm text-muted-foreground">
                  Only authenticated users with access to this tenant can view the dashboard.
                </p>
                {shareType === "private" && (
                  <div className="space-y-2 pt-2">
                    <div className="flex items-center gap-2">
                      <Input value={getPrivateUrl()} readOnly className="text-xs" />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyToClipboard(getPrivateUrl(), "Private link")}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Public Sharing Option */}
            <div className="flex items-start space-x-3 p-3 rounded-lg border">
              <RadioGroupItem value="public" id="public" className="mt-1" disabled={!isPublicSharingEnabled} />
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  <Label htmlFor="public" className="font-medium">
                    Public (API Key Required)
                  </Label>
                  {!isPublicSharingEnabled && (
                    <Badge variant="secondary" className="text-xs">
                      Disabled
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  Anyone with the link and API key can view the dashboard without logging in.
                </p>

                {!isPublicSharingEnabled && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <AlertCircle className="h-4 w-4" />
                    <span>Public sharing is disabled for this tenant</span>
                  </div>
                )}

                {shareType === "public" && isPublicSharingEnabled && (
                  <div className="space-y-4 pt-2">
                    {!publicShare ? (
                      <div className="space-y-3">
                        <div className="flex items-center space-x-2">
                          <Switch id="expiration" checked={hasExpiration} onCheckedChange={setHasExpiration} />
                          <Label htmlFor="expiration" className="text-sm">
                            Set expiration date
                          </Label>
                        </div>

                        {hasExpiration && (
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                className="justify-start text-left font-normal bg-transparent"
                              >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {expirationDate ? format(expirationDate, "PPP") : "Pick a date"}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                              <Calendar
                                mode="single"
                                selected={expirationDate}
                                onSelect={setExpirationDate}
                                disabled={(date) => date < new Date()}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                        )}

                        <Button onClick={createPublicShare} disabled={isLoading} className="w-full">
                          {isLoading ? (
                            <>
                              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                              Creating...
                            </>
                          ) : (
                            "Generate Public Link"
                          )}
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-sm text-green-600">
                          <CheckCircle2 className="h-4 w-4" />
                          <span>Public sharing is active</span>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Share Link</Label>
                          <div className="flex items-center gap-2">
                            <Input value={getPublicUrl()} readOnly className="text-xs" />
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => copyToClipboard(getPublicUrl(), "Public link")}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => window.open(getPublicUrl(), "_blank")}>
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-sm font-medium">API Key</Label>
                          <div className="flex items-center gap-2">
                            <Input value={tenantApiKey} readOnly type="password" className="text-xs" />
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => copyToClipboard(tenantApiKey, "API key")}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        <Separator />

                        <div className="flex items-center justify-between text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Eye className="h-4 w-4" />
                            <span>{publicShare.view_count} views</span>
                          </div>
                          {publicShare.last_accessed_at && (
                            <span>Last accessed {formatRelativeTime(publicShare.last_accessed_at)}</span>
                          )}
                        </div>

                        {publicShare.expires_at && (
                          <div className="text-sm text-muted-foreground">
                            Expires on {format(new Date(publicShare.expires_at), "PPP")}
                          </div>
                        )}

                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={regenerateShare}
                            disabled={isLoading}
                            className="flex-1 bg-transparent"
                          >
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Regenerate
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={deleteShare}
                            disabled={isLoading}
                            className="flex-1 text-destructive hover:text-destructive bg-transparent"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </RadioGroup>
        </div>
      </DialogContent>
    </Dialog>
  )
}
