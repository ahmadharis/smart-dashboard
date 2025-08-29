import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

export async function POST(request: NextRequest) {
  try {
    const { userId, email } = await request.json()

    if (!userId || !email) {
      return NextResponse.json({ error: "Missing userId or email" }, { status: 400 })
    }

    // Create Supabase client with service role key for admin operations
    const supabase = createServerClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      cookies: {
        getAll() {
          return cookies().getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookies().set(name, value, options))
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    })

    // Extract domain from email
    const emailDomain = email.split("@")[1]?.toLowerCase()

    if (!emailDomain) {
      return NextResponse.json({ error: "Invalid email format" }, { status: 400 })
    }

    // Find tenants that match the email domain
    const { data: tenants, error: tenantsError } = await supabase
      .from("tenants")
      .select("tenant_id, name, domain")
      .not("domain", "is", null)

    if (tenantsError) {
      console.error("Error fetching tenants:", tenantsError)
      return NextResponse.json({ error: "Failed to fetch tenants" }, { status: 500 })
    }

    const matchingTenants =
      tenants?.filter((tenant) => {
        if (!tenant.domain) return false

        // Split comma-separated domains and check if any match
        const domains = tenant.domain.split(",").map((d) => d.trim().toLowerCase())
        return domains.includes(emailDomain)
      }) || []

    // Add user to all matching tenants
    if (matchingTenants.length > 0) {
      const userTenantInserts = matchingTenants.map((tenant) => ({
        user_id: userId,
        tenant_id: tenant.tenant_id,
      }))

      const { error: insertError } = await supabase.from("user_tenants").insert(userTenantInserts)

      if (insertError) {
        console.error("Error inserting user_tenants:", insertError)
        return NextResponse.json({ error: "Failed to assign tenant access" }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        message: `User assigned to ${matchingTenants.length} tenant(s)`,
        assignedTenants: matchingTenants.map((t) => ({ id: t.tenant_id, name: t.name })),
      })
    } else {
      return NextResponse.json({
        success: true,
        message: "No matching tenants found for email domain",
        assignedTenants: [],
      })
    }
  } catch (error) {
    console.error("Error in assign-tenant-on-signup:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
