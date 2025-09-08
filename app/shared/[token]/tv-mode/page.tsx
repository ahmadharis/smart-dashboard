import { Suspense } from "react"
import { PublicTVModeClient } from "@/components/public-tv-mode-client"

interface PublicTVModePageProps {
  params: Promise<{
    token: string
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

export default async function PublicTVModePage({ params }: PublicTVModePageProps) {
  const { token } = await params
  
  return (
    <div className="min-h-screen bg-background">
      <Suspense fallback={<TVModeSkeleton />}>
        <PublicTVModeClient token={token} />
      </Suspense>
    </div>
  )
}
