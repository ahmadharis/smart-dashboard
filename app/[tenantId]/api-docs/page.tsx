import { Navigation } from "@/components/navigation"

interface ApiDocsPageProps {
  params: {
    tenantId: string
  }
}

export default function ApiDocsPage({ params }: ApiDocsPageProps) {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-foreground mb-4">API Documentation</h1>
            <p className="text-xl text-muted-foreground">
              Learn how to integrate with our XML to JSON API and dashboard system.
            </p>
          </div>

          <div className="space-y-8">
            {/* Basic Usage */}
            <div className="bg-card border rounded-lg p-6">
              <h2 className="text-2xl font-semibold text-foreground mb-4">Basic Usage</h2>
              <p className="text-muted-foreground mb-4">
                Send XML data to our API endpoint to automatically convert and store it as JSON data. You must specify
                the tenant ID and either an existing dashboard ID or a new dashboard title.
              </p>
              <pre className="bg-muted rounded-lg p-4 overflow-x-auto text-sm">
                <code>{`curl -X POST "https://yourdomain.com/api/upload-xml" \\
-H "Content-Type: application/xml" \\
-H "x-api-key: <apikey>" \\
-H "X-Tenant-Id: ${params.tenantId}" \\
-H "X-Data-Type: Sales" \\
-H "X-Dashboard-Title: My Sales Dashboard" \\
-d '<resultset columns="2" rows="2">
      <row number="1">
        <date>8/11/2023</date>
        <value>2</value>
      </row>
      <row number="2">
        <date>8/11/2024</date>
        <value>3</value>
      </row>
    </resultset>'`}</code>
              </pre>
            </div>

            {/* Authentication Methods */}
            <div className="bg-card border rounded-lg p-6">
              <h2 className="text-2xl font-semibold text-foreground mb-4">Authentication Methods</h2>
              <p className="text-muted-foreground mb-4">The API supports two authentication methods. Choose one:</p>
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-medium text-foreground mb-2">Method 1: x-api-key Header</h3>
                  <pre className="bg-muted rounded-lg p-4 overflow-x-auto text-sm">
                    <code>x-api-key: &lt;apikey&gt;</code>
                  </pre>
                </div>
                <div>
                  <h3 className="text-lg font-medium text-foreground mb-2">Method 2: Authorization Bearer</h3>
                  <pre className="bg-muted rounded-lg p-4 overflow-x-auto text-sm">
                    <code>authorization: Bearer &lt;apikey&gt;</code>
                  </pre>
                </div>
              </div>
            </div>

            {/* Headers Reference */}
            <div className="bg-card border rounded-lg p-6">
              <h2 className="text-2xl font-semibold text-foreground mb-4">Headers Reference</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 font-medium">Header</th>
                      <th className="text-left py-2 font-medium">Required</th>
                      <th className="text-left py-2 font-medium">Description</th>
                    </tr>
                  </thead>
                  <tbody className="text-muted-foreground">
                    <tr className="border-b">
                      <td className="py-2">
                        <code className="bg-muted px-2 py-1 rounded">x-api-key</code>
                      </td>
                      <td className="py-2">
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          Required
                        </span>
                      </td>
                      <td className="py-2">Authentication secret for API access</td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-2">
                        <code className="bg-muted px-2 py-1 rounded">X-Tenant-Id</code>
                      </td>
                      <td className="py-2">
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          Required
                        </span>
                      </td>
                      <td className="py-2">
                        Tenant ID for data isolation. Must be provided for all API calls (current: {params.tenantId})
                      </td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-2">
                        <code className="bg-muted px-2 py-1 rounded">X-Data-Type</code>
                      </td>
                      <td className="py-2">
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          Required
                        </span>
                      </td>
                      <td className="py-2">Type/category of the data being uploaded</td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-2">
                        <code className="bg-muted px-2 py-1 rounded">X-Dashboard-Id</code>
                      </td>
                      <td className="py-2">
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                          Either/Or
                        </span>
                      </td>
                      <td className="py-2">ID of existing dashboard to add data to</td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-2">
                        <code className="bg-muted px-2 py-1 rounded">X-Dashboard-Title</code>
                      </td>
                      <td className="py-2">
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                          Either/Or
                        </span>
                      </td>
                      <td className="py-2">Title for new dashboard (creates dashboard automatically)</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Response Format */}
            <div className="bg-card border rounded-lg p-6">
              <h2 className="text-2xl font-semibold text-foreground mb-4">Response Format</h2>
              <p className="text-muted-foreground mb-4">Successful uploads return JSON with processing details:</p>
              <pre className="bg-muted rounded-lg p-4 overflow-x-auto text-sm">
                <code>{`{
  "success": true,
  "message": "Data processed and saved for Sales",
  "recordCount": 2,
  "fileName": "Sales.json",
  "dashboardId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
}`}</code>
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
