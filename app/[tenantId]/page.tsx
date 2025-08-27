import { Navigation } from "@/components/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { BarChart3, Database, FileText } from "lucide-react"
import Link from "next/link"

interface HomePageProps {
  params: {
    tenantId: string
  }
}

export default function TenantHomePage({ params }: HomePageProps) {
  const { tenantId } = params

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Hero Section */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-foreground mb-4">Smart Dashboard</h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Transform your XML data into interactive dashboards and charts. Upload, analyze, and visualize your data
              with ease.
            </p>
          </div>

          {/* Feature Cards */}
          <div className="grid md:grid-cols-3 gap-6 mb-12">
            <Card className="hover:shadow-lg transition-shadow flex flex-col h-full">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <BarChart3 className="h-8 w-8 text-primary" />
                  <CardTitle>View Dashboards</CardTitle>
                </div>
                <CardDescription>
                  Create beautiful, interactive dashboards from your XML data with multiple chart types.
                </CardDescription>
              </CardHeader>
              <CardContent className="mt-auto">
                <Link href={`/${tenantId}/dashboard`}>
                  <Button className="w-full">View Dashboards</Button>
                </Link>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow flex flex-col h-full">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Database className="h-8 w-8 text-primary" />
                  <CardTitle>Data Management</CardTitle>
                </div>
                <CardDescription>
                  Manage your dashboards, data files, and upload new XML data for analysis.
                </CardDescription>
              </CardHeader>
              <CardContent className="mt-auto">
                <Link href={`/${tenantId}/manage`}>
                  <Button variant="outline" className="w-full bg-transparent">
                    Data Management
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow flex flex-col h-full">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <FileText className="h-8 w-8 text-primary" />
                  <CardTitle>API Documentation</CardTitle>
                </div>
                <CardDescription>
                  Learn how to integrate with our API for automated data uploads and retrieval.
                </CardDescription>
              </CardHeader>
              <CardContent className="mt-auto">
                <Link href={`/${tenantId}/api-docs`}>
                  <Button variant="outline" className="w-full bg-transparent">
                    API Documentation
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <div className="text-center">
            <h2 className="text-2xl font-semibold mb-6">Quick Actions</h2>
            <div className="flex flex-wrap justify-center gap-4">
              <Link href={`/${tenantId}/dashboard`}>
                <Button size="lg">
                  <BarChart3 className="h-5 w-5 mr-2" />
                  View Dashboards
                </Button>
              </Link>
              <Link href={`/${tenantId}/manage`}>
                <Button size="lg" variant="outline">
                  <Database className="h-5 w-5 mr-2" />
                  Data Management
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
