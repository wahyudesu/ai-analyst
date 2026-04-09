"use client"

import { AppLayout } from "@/app/app-layout"
import { ChatSidebar } from "@/components/chat/ChatSidebar"
import { SettingsDialog } from "@/components/SettingsDialog"
import { Button } from "@/components/ui/button"
import { Settings } from "lucide-react"
import type { ReactNode } from "react"
import { useState } from "react"

export default function ChatLayout({
  children,
}: {
  children: ReactNode
}) {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)

  const headerActions = (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setIsSettingsOpen(true)}
      className="hover:bg-accent"
    >
      <Settings className="w-4 h-4" />
    </Button>
  )

  return (
    <AppLayout rightSidebar={<ChatSidebar />} headerActions={headerActions}>
      {children}
      <SettingsDialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen} />
    </AppLayout>
  )
}
