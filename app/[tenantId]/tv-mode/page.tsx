import { Suspense } from "react"
import { TVModeClient } from "@/components/tv-mode-client"

interface TVModePageProps {
  params: Promise<{
    tenantId: string
  }>
  searchParams: Promise<{
    dashboardId?: string
  }>
}

function TVModeSkeleton() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="flex items-center space-x-2">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <span className="text-muted-foreground">Loading TV Mode...</span>
      </div>
    </div>
  )
}

export default async function TVModePage({ params, searchParams }: TVModePageProps) {
  const { tenantId } = await params
  const { dashboardId } = await searchParams
  
  return (
    <div className="min-h-screen bg-background">
      <Suspense fallback={<TVModeSkeleton />}>
        <TVModeClient tenantId={tenantId} dashboardId={dashboardId} />
      </Suspense>
    </div>
  )
}
