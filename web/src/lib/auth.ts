import { betterAuth } from "better-auth"

// Simple in-memory user store (resets on server restart)
// For production, replace with real database (PostgreSQL, MongoDB, etc.)
const users = new Map<string, { email: string; password: string; name: string; id: string }>()

// Simple password hashing (for demo - use bcrypt in production)
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(password)
  const hashBuffer = await crypto.subtle.digest("SHA-256", data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("")
}

// Custom user management without database
const userStore = {
  async create(email: string, password: string, name: string) {
    const id = crypto.randomUUID()
    const hashedPassword = await hashPassword(password)
    const user = { id, email, password: hashedPassword, name }
    users.set(email, user)
    return user
  },
  async findByEmail(email: string) {
    return users.get(email) || null
  },
  async verifyPassword(email: string, password: string) {
    const user = users.get(email)
    if (!user) return null
    const hashedPassword = await hashPassword(password)
    if (user.password !== hashedPassword) return null
    return user
  },
}

// Export auth instance for server-side usage
export const auth = betterAuth({
  baseURL: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  BETTER_AUTH_URL: process.env.BETTER_AUTH_URL || "http://localhost:3000",

  // Email & password authentication
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
    // Custom sign up handler
    sendVerificationEmail: async ({ user, url }: { user: { email: string }; url: string }) => {
      console.log("Verification email sent to:", user.email, "URL:", url)
    },
    // Custom sign in handler
    sendResetPassword: async ({ user, url }: { user: { email: string }; url: string }) => {
      console.log("Password reset requested for:", user.email, "URL:", url)
    },
  },

  // Session configuration - use JWT cookies
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24,
    cookieCache: {
      enabled: true,
      maxAge: 60 * 60 * 24 * 7,
    },
  },

  // Advanced options
  advanced: {
    cookiePrefix: "ba",
    crossSubDomainCookies: {
      enabled: false,
    },
    useSecureCookies: process.env.NODE_ENV === "production",
  },

  account: {
    accountLinking: {
      enabled: false,
    },
  },
})

// Export user store for API routes
export { userStore }
