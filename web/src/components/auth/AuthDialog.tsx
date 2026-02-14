"use client"

import { useState } from "react"
import { LogIn, UserPlus, AlertCircle } from "lucide-react"
import { authClient } from "@/lib/auth-client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

// Password validation
const MIN_PASSWORD_LENGTH = 8
const PASSWORD_REQUIREMENTS = [
  { text: "At least 8 characters", test: (p: string) => p.length >= MIN_PASSWORD_LENGTH },
  { text: "At least 1 lowercase letter", test: (p: string) => /[a-z]/.test(p) },
  { text: "At least 1 uppercase letter", test: (p: string) => /[A-Z]/.test(p) },
  { text: "At least 1 number", test: (p: string) => /\d/.test(p) },
]

function validatePassword(password: string): { isValid: boolean; errors: string[] } {
  const errors = PASSWORD_REQUIREMENTS
    .filter(req => !req.test(password))
    .map(req => req.text)

  return {
    isValid: errors.length === 0,
    errors,
  }
}

export function AuthDialog() {
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [name, setName] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [passwordTouched, setPasswordTouched] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    // Validate password for sign up
    if (isSignUp) {
      const validation = validatePassword(password)
      if (!validation.isValid) {
        setError(validation.errors.join(", "))
        setIsLoading(false)
        return
      }
    }

    try {
      if (isSignUp) {
        // Sign up
        const res = await authClient.signUp.email({
          email,
          password,
          name,
        })

        if (res.error) {
          setError(res.error.message || "Failed to sign up")
        }
        // Success - session will be automatically handled
      } else {
        // Sign in
        const res = await authClient.signIn.email({
          email,
          password,
        })

        if (res.error) {
          setError(res.error.message || "Failed to sign in")
        }
        // Success - session will be automatically handled
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  const passwordValidation = validatePassword(password)
  const showPasswordErrors = passwordTouched && isSignUp && password.length > 0

  return (
    <div className="flex items-center justify-center min-h-screen bg-zinc-50 dark:bg-zinc-900">
      <div className="w-full max-w-md p-8 bg-white dark:bg-zinc-800 rounded-2xl shadow-lg">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-orange-100 dark:bg-orange-900/30 rounded-xl flex items-center justify-center mx-auto mb-4">
            <LogIn className="w-8 h-8 text-orange-600 dark:text-orange-400" />
          </div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            {isSignUp ? "Create an account" : "Welcome back"}
          </h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-2">
            {isSignUp
              ? "Sign up to start analyzing your data"
              : "Sign in to access your data analyst"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isSignUp && (
            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Name
              </label>
              <Input
                id="name"
                type="text"
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoComplete="name"
              />
            </div>
          )}

          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Email
            </label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete={isSignUp ? "email" : "username"}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Password
            </label>
            <Input
              id="password"
              type="password"
              placeholder="•••••••••"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
                if (!passwordTouched) setPasswordTouched(true)
              }}
              onBlur={() => setPasswordTouched(true)}
              required
              autoComplete={isSignUp ? "new-password" : "current-password"}
              minLength={MIN_PASSWORD_LENGTH}
              className={showPasswordErrors && passwordValidation.errors.length > 0 ? "border-red-500 focus-visible:border-red-500" : ""}
            />
            {isSignUp && (
              <div className="space-y-1">
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Password must contain:
                </p>
                <ul className="text-xs space-y-1 ml-4">
                  {PASSWORD_REQUIREMENTS.map((req, idx) => {
                    const isValid = req.test(password)
                    return (
                      <li
                        key={idx}
                        className={isValid ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}
                      >
                        {isValid ? "✓" : "○"} {req.text}
                      </li>
                    )
                  })}
                </ul>
              </div>
            )}
          </div>

          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
            </div>
          )}

          <Button
            type="submit"
            disabled={isLoading || (isSignUp && passwordValidation.errors.length > 0)}
            className="w-full bg-orange-600 hover:bg-orange-700 gap-2"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                {isSignUp ? "Creating account..." : "Signing in..."}
              </>
            ) : (
              <>
                {isSignUp ? (
                  <>
                    <UserPlus className="w-4 h-4" />
                    Sign Up
                  </>
                ) : (
                  <>
                    <LogIn className="w-4 h-4" />
                    Sign In
                  </>
                )}
              </>
            )}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={() => {
              setIsSignUp(!isSignUp)
              setError(null)
            }}
            className="text-sm text-orange-600 dark:text-orange-400 hover:underline"
          >
            {isSignUp
              ? "Already have an account? Sign in"
              : "Don't have an account? Sign up"}
          </button>
        </div>
      </div>
    </div>
  )
}
