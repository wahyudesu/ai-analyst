/**
 * Simple Auth - localStorage based authentication
 * For demo/internal use only
 */

import React from "react";

export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: string;
}

export interface StoredUser extends User {
  password: string; // In production, this should be hashed!
}

const STORAGE_KEY = "ai-analyst-users";
const SESSION_KEY = "ai-analyst-session";

// Simple password hashing (for demo only - use bcrypt in real production)
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export const simpleAuth = {
  /**
   * Get all users from localStorage
   */
  getUsers(): StoredUser[] {
    if (typeof window === "undefined") return [];
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  },

  /**
   * Save users to localStorage
   */
  saveUsers(users: StoredUser[]): void {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
  },

  /**
   * Get current session
   */
  getSession(): User | null {
    if (typeof window === "undefined") return null;
    const data = localStorage.getItem(SESSION_KEY);
    return data ? JSON.parse(data) : null;
  },

  /**
   * Set current session
   */
  setSession(user: User): void {
    if (typeof window === "undefined") return;
    localStorage.setItem(SESSION_KEY, JSON.stringify(user));
  },

  /**
   * Clear session
   */
  clearSession(): void {
    if (typeof window === "undefined") return;
    localStorage.removeItem(SESSION_KEY);
  },

  /**
   * Sign up new user
   */
  async signUp(email: string, password: string, name: string): Promise<{ success: boolean; user?: User; error?: string }> {
    const users = this.getUsers();

    // Check if email already exists
    if (users.find((u) => u.email === email)) {
      return { success: false, error: "Email already registered" };
    }

    // Create new user
    const hashedPassword = await hashPassword(password);
    const newUser: StoredUser = {
      id: crypto.randomUUID(),
      email,
      password: hashedPassword,
      name,
      createdAt: new Date().toISOString(),
    };

    users.push(newUser);
    this.saveUsers(users);

    // Auto sign in after sign up
    const { password: _, ...userSession } = newUser;
    this.setSession(userSession);

    return { success: true, user: userSession };
  },

  /**
   * Sign in existing user
   */
  async signIn(email: string, password: string): Promise<{ success: boolean; user?: User; error?: string }> {
    const users = this.getUsers();
    const user = users.find((u) => u.email === email);

    if (!user) {
      return { success: false, error: "Invalid email or password" };
    }

    const hashedPassword = await hashPassword(password);
    if (user.password !== hashedPassword) {
      return { success: false, error: "Invalid email or password" };
    }

    // Create session
    const { password: _, ...userSession } = user;
    this.setSession(userSession);

    return { success: true, user: userSession };
  },

  /**
   * Sign out
   */
  signOut(): void {
    this.clearSession();
  },

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return this.getSession() !== null;
  },

  /**
   * Get current user
   */
  getCurrentUser(): User | null {
    return this.getSession();
  },
};

// React hook for auth
export function useSimpleAuth() {
  const [user, setUser] = React.useState<User | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    // Check session on mount
    const session = simpleAuth.getSession();
    setUser(session);
    setIsLoading(false);
  }, []);

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    signUp: simpleAuth.signUp,
    signIn: simpleAuth.signIn,
    signOut: simpleAuth.signOut,
  };
}

// For non-component usage
export function useAuth() {
  const [session, setSession] = React.useState<User | null>(null);
  const [isPending, setIsPending] = React.useState(true);

  React.useEffect(() => {
    const session = simpleAuth.getSession();
    setSession(session);
    setIsPending(false);
  }, []);

  return {
    data: { user: session },
    isPending,
    signIn: simpleAuth.signIn,
    signOut: simpleAuth.signOut,
    signUp: simpleAuth.signUp,
  };
}
