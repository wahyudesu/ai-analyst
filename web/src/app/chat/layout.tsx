"use client"

import { AppLayout } from "@/app/app-layout"
import { ChatSidebar } from "@/components/chat/ChatSidebar"
import type { ReactNode } from "react"

export default function ChatLayout({
  children,
}: {
  children: ReactNode
}) {
  return <AppLayout rightSidebar={<ChatSidebar />}>{children}</AppLayout>
}
