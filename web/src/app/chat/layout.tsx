"use client"

import { AppLayout } from "@/app/app-layout"
import type { ReactNode } from "react"

export default function ChatLayout({
  children,
}: {
  children: ReactNode
}) {
  return <AppLayout>{children}</AppLayout>
}
