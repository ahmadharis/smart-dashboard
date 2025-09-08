import { Navigation } from "@/components/navigation"
import { FileManagementClient } from "@/components/file-management-client"
import { ProtectedRoute } from "@/components/protected-route"

interface ManagePageProps {
  params: Promise<{
    tenantId: string
  }>
}

export default async function ManagePage({ params }: ManagePageProps) {
  const { tenantId } = await params
  
  return (
    <ProtectedRoute tenantId={tenantId}>
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-foreground mb-2">Data Management</h1>
            <p className="text-muted-foreground text-lg">Add new data files or remove existing ones</p>
          </div>

          <FileManagementClient tenantId={tenantId} />
        </div>
      </div>
    </ProtectedRoute>
  )
}
