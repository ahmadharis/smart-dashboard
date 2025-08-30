import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Navigation } from "@/components/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { CheckCircle } from "lucide-react"

export default async function ProtectedPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  // Check if user has email confirmed
  if (!user.email_confirmed_at) {
    redirect("/auth/sign-up-success")
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-md mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl text-center flex items-center justify-center space-x-2">
                <CheckCircle className="h-6 w-6 text-green-600" />
                <span>Email Verified!</span>
              </CardTitle>
              <CardDescription className="text-center">Your account has been successfully verified</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground text-center">
                Welcome to Smart Dashboard! Your email has been confirmed and you're now signed in.
              </p>
              <Button asChild className="w-full">
                <Link href="/">Continue to Dashboard</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
