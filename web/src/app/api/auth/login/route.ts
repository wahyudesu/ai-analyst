import { type NextRequest, NextResponse } from "next/server"

interface StoredUser {
  id: string
  email: string
  password: string
  name: string
  createdAt: string
}

// Simple password hashing
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(password)
  const hashBuffer = await crypto.subtle.digest("SHA-256", data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("")
}

// Get users from environment variable (server-side - safe)
function getUsersFromEnv(): StoredUser[] {
  const envUsers = process.env.AUTH_USERS

  if (!envUsers) {
    // Return default demo users if no env var set
    return [
      {
        id: "1",
        email: "admin@example.com",
        password:
          "240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9", // "admin123"
        name: "Admin",
        createdAt: new Date().toISOString(),
      },
    ]
  }

  try {
    const parsed = JSON.parse(envUsers)
    return parsed.map((u: StoredUser, index: number) => ({
      id: u.id || `user-${index}`,
      email: u.email,
      password: u.password,
      name: u.name,
      createdAt: u.createdAt || new Date().toISOString(),
    }))
  } catch {
    return []
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password } = body

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: "Email and password are required" },
        { status: 400 }
      )
    }

    const users = getUsersFromEnv()
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase())

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Invalid email or password" },
        { status: 401 }
      )
    }

    const hashedPassword = await hashPassword(password)
    if (user.password !== hashedPassword) {
      return NextResponse.json(
        { success: false, error: "Invalid email or password" },
        { status: 401 }
      )
    }

    // Return user without password
    const { password: _, ...userSession } = user
    return NextResponse.json({ success: true, user: userSession })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "An error occurred" },
      { status: 500 }
    )
  }
}
