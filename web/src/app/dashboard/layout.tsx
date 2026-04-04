"use client"

import { AppLayout } from "@/app/app-layout"
import {
  DashboardProvider,
  useDashboard,
} from "@/components/dashboard/DashboardContext"

function DashboardLayoutContent({ children }: { children: React.ReactNode }) {
  const { headerActions } = useDashboard()
  return <AppLayout headerActions={headerActions}>{children}</AppLayout>
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <DashboardProvider>
      <DashboardLayoutContent>{children}</DashboardLayoutContent>
    </DashboardProvider>
  )
}
