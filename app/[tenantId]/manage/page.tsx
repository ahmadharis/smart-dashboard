import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Navigation } from "@/components/navigation"
import { FileManagementClient } from "@/components/file-management-client"

interface ManagePageProps {
  params: {
    tenantId: string
  }
}

export default async function ManagePage({ params }: ManagePageProps) {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.getUser()
  if (error || !data?.user) {
    redirect("/auth/login")
  }

  // Check tenant access
  const { data: tenantAccess, error: accessError } = await supabase
    .from("user_tenants")
    .select("id")
    .eq("user_id", data.user.id)
    .eq("tenant_id", params.tenantId)
    .single()

  if (accessError || !tenantAccess) {
    redirect(`/?error=access_denied&tenant=${params.tenantId}`)
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">Data Management</h1>
          <p className="text-muted-foreground text-lg">Add new data files or remove existing ones</p>
        </div>

        <FileManagementClient tenantId={params.tenantId} />
      </div>
    </div>
  )
}
