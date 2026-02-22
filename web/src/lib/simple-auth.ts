/**
 * Simple Auth - Server-side API based authentication
 * For demo/internal use only - users defined in server environment (AUTH_USERS)
 */

import React from "react";

export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: string;
}

const SESSION_KEY = "ai-analyst-session";

function getSession(): User | null {
  if (typeof window === "undefined") return null;
  const data = localStorage.getItem(SESSION_KEY);
  return data ? JSON.parse(data) : null;
}

function setSession(user: User): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(SESSION_KEY, JSON.stringify(user));
}

function clearSession(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(SESSION_KEY);
}

/**
 * Sign in with email and password
 * Validates against users defined in server-side AUTH_USERS environment variable
 * Uses API route to keep credentials secure on the server
 */
export async function signIn(email: string, password: string): Promise<{ success: boolean; user?: User; error?: string }> {
  try {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });

    const result = await response.json();

    if (result.success && result.user) {
      setSession(result.user);
      return { success: true, user: result.user };
    }

    return { success: false, error: result.error || "Sign in failed" };
  } catch (error) {
    return { success: false, error: "Network error. Please try again." };
  }
}

export function signOut(): void {
  clearSession();
}

export function isAuthenticated(): boolean {
  return getSession() !== null;
}

export function getCurrentUser(): User | null {
  return getSession();
}

// React hook for auth
export function useSimpleAuth() {
  const [user, setUser] = React.useState<User | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    // Check session on mount
    const session = getSession();
    setUser(session);
    setIsLoading(false);
  }, []);

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    signIn,
    signOut,
  };
}

// For non-component usage (compatible with old auth pattern)
export function useAuth() {
  const [session, setSessionState] = React.useState<User | null>(null);
  const [isPending, setIsPending] = React.useState(true);

  React.useEffect(() => {
    const currentSession = getSession();
    setSessionState(currentSession);
    setIsPending(false);
  }, []);

  return {
    data: { user: session },
    isPending,
    signIn,
    signOut,
  };
}
