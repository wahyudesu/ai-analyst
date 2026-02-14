"use client"

import type { ReactNode } from "react"

export function AuthProvider({ children }: { children: ReactNode }) {
  // BetterAuth/react handles session state through its client
  // The provider is a passthrough for now - we can add
  // additional auth context here if needed
  return <>{children}</>
}
