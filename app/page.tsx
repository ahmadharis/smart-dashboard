import { Suspense } from "react"
import { TenantSelector } from "@/components/tenant-selector"
import { ProtectedRoute } from "@/components/protected-route"

function TenantSelectorWrapper() {
  return <TenantSelector />
}

export default function HomePage() {
  return (
    <ProtectedRoute tenantId="tenant-selector">
      <Suspense
        fallback={
          <div className="min-h-screen bg-background flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        }
      >
        <TenantSelectorWrapper />
      </Suspense>
    </ProtectedRoute>
  )
}
