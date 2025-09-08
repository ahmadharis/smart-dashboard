import { createServiceClient } from "@/lib/supabase"

export interface PublicAuthResult {
  isValid: boolean
  error?: string
  tenant?: {
    tenant_id: string
    name: string
  }
  share?: {
    share_id: string
    dashboard_id: string
    share_token: string
    expires_at: string | null
    view_count: number
  }
}

export async function validatePublicAccessByToken(shareToken: string): Promise<PublicAuthResult> {
  try {
    if (!shareToken) {
      return { isValid: false, error: "Share token is required" }
    }

    const supabase = createServiceClient()

    // Get share record with dashboard and tenant info
    const { data: shareData, error: shareError } = await supabase
      .from("public_dashboard_shares")
      .select(`
        share_id,
        dashboard_id,
        share_token,
        expires_at,
        view_count,
        dashboards!inner(
          id,
          tenant_id,
          tenants!inner(
            tenant_id,
            name
          )
        )
      `)
      .eq("share_token", shareToken)
      .single()

    if (shareError || !shareData) {
      return { isValid: false, error: "Invalid share token" }
    }

    // Check if share has expired
    if (shareData.expires_at && new Date(shareData.expires_at) < new Date()) {
      return { isValid: false, error: "Share link has expired" }
    }

    // Get tenant info
    const tenant = shareData.dashboards.tenants

    // Check if tenant allows public sharing
    const { data: settingData } = await supabase
      .from("settings")
      .select("value")
      .eq("tenant_id", tenant.tenant_id)
      .eq("key", "allow_public_sharing")
      .single()

    if (settingData?.value !== "true") {
      return { isValid: false, error: "Public sharing is disabled for this tenant" }
    }

    // Update view count and last accessed
    await supabase
      .from("public_dashboard_shares")
      .update({
        view_count: shareData.view_count + 1,
        last_accessed_at: new Date().toISOString(),
      })
      .eq("share_token", shareToken)

    return {
      isValid: true,
      tenant: {
        tenant_id: tenant.tenant_id,
        name: tenant.name,
      },
      share: {
        share_id: shareData.share_id,
        dashboard_id: shareData.dashboard_id,
        share_token: shareData.share_token,
        expires_at: shareData.expires_at,
        view_count: shareData.view_count + 1,
      },
    }
  } catch (error) {
    console.error("Public auth validation error:", error)
    return { isValid: false, error: "Authentication failed" }
  }
}

export async function validatePublicAccess(shareToken: string, apiKey: string): Promise<PublicAuthResult> {
  try {
    if (!shareToken || !apiKey) {
      return { isValid: false, error: "Share token and API key are required" }
    }

    const supabase = createServiceClient()

    // Get share record with dashboard and tenant info
    const { data: shareData, error: shareError } = await supabase
      .from("public_dashboard_shares")
      .select(`
        share_id,
        dashboard_id,
        share_token,
        expires_at,
        view_count,
        dashboards!inner(
          dashboard_id,
          tenant_id,
          tenants!inner(
            tenant_id,
            name,
            api_key
          )
        )
      `)
      .eq("share_token", shareToken)
      .single()

    if (shareError || !shareData) {
      return { isValid: false, error: "Invalid share token" }
    }

    // Check if share has expired
    if (shareData.expires_at && new Date(shareData.expires_at) < new Date()) {
      return { isValid: false, error: "Share link has expired" }
    }

    // Validate API key matches tenant's API key
    const tenant = shareData.dashboards.tenants
    if (tenant.api_key !== apiKey) {
      return { isValid: false, error: "Invalid API key" }
    }

    // Check if tenant allows public sharing
    const { data: settingData } = await supabase
      .from("settings")
      .select("value")
      .eq("tenant_id", tenant.tenant_id)
      .eq("key", "allow_public_sharing")
      .single()

    if (settingData?.value !== "true") {
      return { isValid: false, error: "Public sharing is disabled for this tenant" }
    }

    // Update view count and last accessed
    await supabase
      .from("public_dashboard_shares")
      .update({
        view_count: shareData.view_count + 1,
        last_accessed_at: new Date().toISOString(),
      })
      .eq("share_token", shareToken)

    return {
      isValid: true,
      tenant: {
        tenant_id: tenant.tenant_id,
        name: tenant.name,
      },
      share: {
        share_id: shareData.share_id,
        dashboard_id: shareData.dashboard_id,
        share_token: shareData.share_token,
        expires_at: shareData.expires_at,
        view_count: shareData.view_count + 1,
      },
    }
  } catch (error) {
    console.error("Public auth validation error:", error)
    return { isValid: false, error: "Authentication failed" }
  }
}
