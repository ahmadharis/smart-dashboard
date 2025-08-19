import { Suspense } from "react"
import { DashboardClient } from "@/components/dashboard-client"

interface DashboardPageProps {
  params: {
    tenantId: string
  }
}

function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 pt-4">
        <div className="mb-8">
          <div className="flex items-center gap-4 py-6 animate-pulse">
            <div className="h-6 w-48 bg-muted rounded"></div>
            <div className="h-8 w-32 bg-muted rounded"></div>
            <div className="h-8 w-20 bg-muted rounded"></div>
          </div>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-64 bg-muted rounded-lg animate-pulse"></div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function DashboardPage({ params }: DashboardPageProps) {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 pt-4">
        <Suspense fallback={<DashboardSkeleton />}>
          <DashboardClient tenantId={params.tenantId} />
        </Suspense>
      </div>
    </div>
  )
}
