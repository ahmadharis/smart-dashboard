import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { BarChart3, Mail } from "lucide-react"
import { Navigation } from "@/components/navigation"

export default function SignUpSuccessPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-md mx-auto">
          <div className="text-center mb-8">
            <Link
              href="/"
              className="flex items-center justify-center space-x-2 hover:opacity-80 transition-opacity mb-6"
            >
              <BarChart3 className="h-8 w-8 text-primary" />
              <span className="font-bold text-2xl">Smart Dashboard</span>
            </Link>
          </div>

          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                <Mail className="h-6 w-6 text-green-600" />
              </div>
              <CardTitle className="text-2xl">Check Your Email</CardTitle>
              <CardDescription>We've sent you a verification link to complete your registration</CardDescription>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <p className="text-sm text-muted-foreground">
                Please check your email and click the verification link to activate your account. You won't be able to
                sign in until your email is verified.
              </p>

              <div className="pt-4">
                <Button asChild className="w-full">
                  <Link href="/auth/login">Continue to Sign In</Link>
                </Button>
              </div>

              <p className="text-xs text-muted-foreground">
                Didn't receive an email? Check your spam folder or try signing up again.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
