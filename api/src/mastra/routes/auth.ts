/**
 * Authentication Routes
 */

import { registerApiRoute } from "@mastra/core/server"
import { isAuthEnabled, login } from "../lib/auth.js"

/**
 * POST /api/auth/login
 * Login with email and password, returns JWT token
 */
export const loginRoute = registerApiRoute("/auth/login", {
  method: "POST",
  handler: async c => {
    try {
      // If auth is disabled, return a dummy token
      if (!isAuthEnabled()) {
        return c.json({
          success: true,
          token: "dev-mode-bypass-token",
          message: "Auth disabled in development mode",
        })
      }

      const body = await c.req.json()
      const { email, password } = body

      if (!email || !password) {
        return c.json(
          { success: false, error: "Email and password are required" },
          400
        )
      }

      const result = await login({ email, password })

      if (result.success) {
        return c.json({
          success: true,
          token: result.token,
        })
      }

      return c.json({ success: false, error: result.error }, 401)
    } catch (error) {
      console.error("Login error:", error)
      return c.json({ success: false, error: "Login failed" }, 500)
    }
  },
})

/**
 * GET /api/auth/check
 * Check if current token is valid
 */
export const checkAuthRoute = registerApiRoute("/auth/check", {
  method: "GET",
  handler: async c => {
    // If auth is disabled, always return valid
    if (!isAuthEnabled()) {
      return c.json({ valid: true, mode: "development" })
    }

    const authHeader = c.req.header("Authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return c.json({ valid: false }, 401)
    }

    // The actual verification happens in middleware
    // If we reach here, the token is valid (assuming middleware is applied)
    return c.json({ valid: true })
  },
})
