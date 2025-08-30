"use client"

import type React from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useState, useEffect } from "react"
import { BarChart3, CheckCircle, AlertCircle } from "lucide-react"
import { Navigation } from "@/components/navigation"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()

  const redirectTo = searchParams.get("redirectTo") || "/"
  const message = searchParams.get("message")
  const errorParam = searchParams.get("error")

  useEffect(() => {
    const checkUser = async () => {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (user) {
        router.push(redirectTo)
      }
    }
    checkUser()

    if (message === "signup-success") {
      setSuccess("Account created successfully! Please check your email to verify your account.")
    }

    if (errorParam) {
      switch (errorParam) {
        case "verification-failed":
          setError("Email verification failed. Please try signing up again or contact support.")
          break
        case "session-expired":
          setError("Your session has expired. Please sign in again.")
          break
        case "loading-timeout":
          setError("Authentication timed out. Please try signing in again.")
          break
        default:
          setError("An authentication error occurred. Please try again.")
      }
    }
  }, [router, redirectTo, message, errorParam])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    const supabase = createClient()
    setIsLoading(true)
    setError(null)

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
        options: {
          emailRedirectTo: process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL || `${window.location.origin}/`,
        },
      })
      if (error) throw error

      router.push(redirectTo)
    } catch (error: unknown) {
      if (error instanceof Error) {
        if (error.message.includes("Invalid login credentials")) {
          setError("Invalid email or password. Please check your credentials and try again.")
        } else if (error.message.includes("Email not confirmed")) {
          setError("Please check your email and click the verification link before signing in.")
        } else {
          setError(error.message)
        }
      } else {
        setError("An error occurred during sign in")
      }
    } finally {
      setIsLoading(false)
    }
  }

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
            <CardHeader>
              <CardTitle className="text-2xl text-center">Welcome Back</CardTitle>
              <CardDescription className="text-center">Sign in to your account to continue</CardDescription>
            </CardHeader>
            <CardContent>
              {success && (
                <Alert className="border-green-200 bg-green-50 mb-4">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">{success}</AlertDescription>
                </Alert>
              )}

              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter your password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                {error && (
                  <Alert className="border-red-200 bg-red-50">
                    <AlertCircle className="h-4 w-4 text-red-600" />
                    <AlertDescription className="text-red-800">{error}</AlertDescription>
                  </Alert>
                )}
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "Signing in..." : "Sign In"}
                </Button>
              </form>

              <div className="mt-4 text-center text-sm">
                Don't have an account?{" "}
                <Link href="/auth/sign-up" className="underline underline-offset-4 hover:text-primary">
                  Sign up
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
