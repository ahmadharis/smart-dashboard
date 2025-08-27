"use client"

import Link from "next/link"
import { usePathname, useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { BarChart3, Upload, Home, FileText } from "lucide-react"
import { UserNav } from "@/components/user-nav"

export function Navigation() {
  const pathname = usePathname()
  const params = useParams()
  const tenantId = params?.tenantId as string

  return (
    <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link
              href={tenantId ? `/${tenantId}` : "/"}
              className="flex items-center space-x-2 hover:opacity-80 transition-opacity"
            >
              <BarChart3 className="h-6 w-6" />
              <span className="font-bold text-xl">Smart Dashboard</span>
            </Link>
          </div>

          <div className="flex items-center space-x-4">
            <Button variant="ghost" asChild>
              <Link href={tenantId ? `/${tenantId}` : "/"} className="flex items-center space-x-2">
                <Home className="h-4 w-4" />
                <span>Home</span>
              </Link>
            </Button>
            {tenantId && (
              <>
                <Button variant="ghost" asChild>
                  <Link href={`/${tenantId}/dashboard`} className="flex items-center space-x-2">
                    <BarChart3 className="h-4 w-4" />
                    <span>Dashboard</span>
                  </Link>
                </Button>
                <Button variant="ghost" asChild>
                  <Link href={`/${tenantId}/manage`} className="flex items-center space-x-2">
                    <Upload className="h-4 w-4" />
                    <span>Manage</span>
                  </Link>
                </Button>
                <Button variant="ghost" asChild>
                  <Link href={`/${tenantId}/api-docs`} className="flex items-center space-x-2">
                    <FileText className="h-4 w-4" />
                    <span>API Docs</span>
                  </Link>
                </Button>
              </>
            )}
            <UserNav />
          </div>
        </div>
      </div>
    </nav>
  )
}
