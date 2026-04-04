"use client"

import { type ReactNode, createContext, useContext, useState } from "react"

interface DashboardContextValue {
  headerActions: ReactNode
  setHeaderActions: (actions: ReactNode) => void
}

const DashboardContext = createContext<DashboardContextValue | undefined>(
  undefined
)

export function useDashboard() {
  const context = useContext(DashboardContext)
  if (!context) {
    throw new Error("useDashboard must be used within DashboardProvider")
  }
  return context
}

interface DashboardProviderProps {
  children: ReactNode
}

export function DashboardProvider({ children }: DashboardProviderProps) {
  const [headerActions, setHeaderActions] = useState<ReactNode>(null)

  return (
    <DashboardContext.Provider value={{ headerActions, setHeaderActions }}>
      {children}
    </DashboardContext.Provider>
  )
}
