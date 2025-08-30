"use client"

import Link from "next/link"
import { usePathname, useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { BarChart3, Upload, Home, FileText, Menu } from "lucide-react"
import { UserNav } from "@/components/user-nav"
import { useIsMobile } from "@/hooks/use-mobile"
import { useState } from "react"

export function Navigation() {
  const pathname = usePathname()
  const params = useParams()
  const tenantId = params?.tenantId as string
  const isMobile = useIsMobile()
  const [isOpen, setIsOpen] = useState(false)

  const navigationItems = [
    {
      href: tenantId ? `/${tenantId}` : "/",
      icon: Home,
      label: "Home",
      show: true,
    },
    {
      href: `/${tenantId}/dashboard`,
      icon: BarChart3,
      label: "Dashboard",
      show: !!tenantId,
    },
    {
      href: `/${tenantId}/manage`,
      icon: Upload,
      label: "Manage",
      show: !!tenantId,
    },
    {
      href: `/${tenantId}/api-docs`,
      icon: FileText,
      label: "API Docs",
      show: !!tenantId,
    },
  ]

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

          {!isMobile && (
            <div className="flex items-center space-x-4">
              {navigationItems.map((item) =>
                item.show ? (
                  <Button key={item.href} variant="ghost" asChild>
                    <Link href={item.href} className="flex items-center space-x-2">
                      <item.icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </Link>
                  </Button>
                ) : null,
              )}
              <UserNav />
            </div>
          )}

          {isMobile && (
            <div className="flex items-center space-x-2">
              <Sheet open={isOpen} onOpenChange={setIsOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <Menu className="h-5 w-5" />
                    <span className="sr-only">Toggle navigation menu</span>
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-[300px] sm:w-[400px]">
                  <div className="flex flex-col space-y-4 mt-8">
                    {navigationItems.map((item) =>
                      item.show ? (
                        <Button
                          key={item.href}
                          variant="ghost"
                          asChild
                          className="justify-start"
                          onClick={() => setIsOpen(false)}
                        >
                          <Link href={item.href} className="flex items-center space-x-2">
                            <item.icon className="h-4 w-4" />
                            <span>{item.label}</span>
                          </Link>
                        </Button>
                      ) : null,
                    )}
                  </div>
                </SheetContent>
              </Sheet>
              <UserNav />
            </div>
          )}
        </div>
      </div>
    </nav>
  )
}
