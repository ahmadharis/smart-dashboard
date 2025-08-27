import { Suspense } from "react"
import { TenantSelector } from "@/components/tenant-selector"

function TenantSelectorWrapper() {
  return <TenantSelector />
}

export default function HomePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      }
    >
      <TenantSelectorWrapper />
    </Suspense>
  )
}
