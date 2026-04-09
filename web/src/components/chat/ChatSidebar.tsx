"use client"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { threadsClient } from "@/lib/threads-client"
import {
  ChartBar,
  Check,
  Database,
  Edit2,
  MessageSquare,
  Pin,
  Plus,
  Sparkles,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { useCallback, useEffect, useMemo, useState } from "react"

// Constants - hoisted outside component
const DEFAULT_AGENT_ID = "data-analyst"
const CHAT_SESSIONS_KEY = "chat-sessions"
const THREAD_ID_DISPLAY_LENGTH = 8

const AGENT_ICONS = {
  "data-analyst": Database,
  "chart-agent": ChartBar,
  "supabase-agent": Database,
} as const

type AgentId = keyof typeof AGENT_ICONS

interface ChatSession {
  id: string
  title: string
  createdAt: Date
  agentId?: string
  isPinned?: boolean
}

interface DeleteDialogState {
  isOpen: boolean
  sessionId: string | null
  sessionTitle: string
}

const INITIAL_DELETE_DIALOG: DeleteDialogState = {
  isOpen: false,
  sessionId: null,
  sessionTitle: "",
}

// ============================================================================
// Helper functions - hoisted outside component
// ============================================================================

function loadSessionsFromStorage(): ChatSession[] {
  try {
    const stored = localStorage.getItem(CHAT_SESSIONS_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      return parsed.map((s: any) => ({
        ...s,
        createdAt: new Date(s.createdAt),
      }))
    }
  } catch (error) {
    console.error("Failed to load chat sessions:", error)
  }
  return []
}

function saveSessionsToStorage(sessions: ChatSession[]): void {
  try {
    localStorage.setItem(CHAT_SESSIONS_KEY, JSON.stringify(sessions))
  } catch (error) {
    console.error("Failed to save chat sessions:", error)
  }
}

function sortSessions(sessions: ChatSession[]): ChatSession[] {
  return [...sessions].sort((a, b) => {
    // Pinned sessions first
    if (a.isPinned && !b.isPinned) return -1
    if (!a.isPinned && b.isPinned) return 1
    // Then by creation date (newest first)
    return b.createdAt.getTime() - a.createdAt.getTime()
  })
}

function getAgentIconComponent(agentId?: string): React.ElementType {
  return AGENT_ICONS[agentId as AgentId] || MessageSquare
}

// ============================================================================
// Main component
// ============================================================================

export function ChatSidebar() {
  const router = useRouter()
  const currentThreadId = threadsClient.getOrCreateThreadId()

  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState("")
  const [deleteDialog, setDeleteDialog] = useState<DeleteDialogState>(
    INITIAL_DELETE_DIALOG
  )
  const [sessionActionsOpen, setSessionActionsOpen] = useState<string | null>(
    null
  )

  // Load sessions on mount - empty deps since loadSessionsFromStorage is stable
  useEffect(() => {
    setSessions(loadSessionsFromStorage())
  }, [])

  // Stable callbacks - no dependencies needed for localStorage operations
  const saveSessions = useCallback((updatedSessions: ChatSession[]) => {
    saveSessionsToStorage(updatedSessions)
  }, [])

  const startNewChat = useCallback(() => {
    // Clear messages from current thread before switching
    const currentThread = threadsClient.getOrCreateThreadId()
    threadsClient.clearMessages(currentThread)

    threadsClient.clearCurrentThreadId()
    threadsClient.getOrCreateThreadId()
    router.push("/chat")
    // Force reload to reset the chat
    window.location.reload()
  }, [router])

  const switchSession = useCallback(
    (sessionId: string) => {
      threadsClient.setCurrentThreadId(sessionId)
      router.push("/chat")
      window.location.reload()
    },
    [router]
  )

  const deleteSession = useCallback(
    (sessionId: string) => {
      setSessions(prev => {
        const updated = prev.filter(s => s.id !== sessionId)
        saveSessions(updated)
        return updated
      })

      // Delete messages from localStorage
      threadsClient.deleteMessages(sessionId)

      if (sessionId === currentThreadId) {
        startNewChat()
      }

      setDeleteDialog({ ...INITIAL_DELETE_DIALOG })
    },
    [currentThreadId, saveSessions, startNewChat]
  )

  const pinSession = useCallback(
    (sessionId: string) => {
      setSessions(prev => {
        const updated = prev.map(s =>
          s.id === sessionId ? { ...s, isPinned: !s.isPinned } : s
        )
        saveSessions(updated)
        return updated
      })
    },
    [saveSessions]
  )

  const renameSession = useCallback(
    (sessionId: string, newTitle: string) => {
      setSessions(prev => {
        const updated = prev.map(s =>
          s.id === sessionId ? { ...s, title: newTitle } : s
        )
        saveSessions(updated)
        return updated
      })

      setEditingSessionId(null)
    },
    [saveSessions]
  )

  const confirmDeleteSession = useCallback(
    (sessionId: string, sessionTitle: string) => {
      setDeleteDialog({
        isOpen: true,
        sessionId,
        sessionTitle,
      })
    },
    []
  )

  const startEditing = useCallback((sessionId: string, title: string) => {
    setEditingTitle(title)
    setEditingSessionId(sessionId)
    setSessionActionsOpen(null)
  }, [])

  const togglePinSession = useCallback(
    (sessionId: string) => {
      pinSession(sessionId)
      setSessionActionsOpen(null)
    },
    [pinSession]
  )

  const requestDeleteSession = useCallback(
    (sessionId: string) => {
      const session = sessions.find(s => s.id === sessionId)
      confirmDeleteSession(sessionId, session?.title || "This chat")
      setSessionActionsOpen(null)
    },
    [sessions, confirmDeleteSession]
  )

  // Sorted sessions - memoized to avoid resorting on every render
  const sortedSessions = useMemo(() => sortSessions(sessions), [sessions])

  return (
    <div className="flex flex-col h-full border-r border-border bg-background">
      {/* Header with New Chat Button */}
      <div className="p-4 border-b border-border bg-card/50">
        <Button
          onClick={startNewChat}
          className="w-full justify-start gap-2"
          size="sm"
        >
          <Plus className="w-4 h-4" />
          <span>New Chat</span>
          <Badge variant="secondary" className="ml-auto text-xs">
            {sortedSessions.filter(s => !s.isPinned).length}
          </Badge>
        </Button>
      </div>

      {/* Sessions List */}
      <ScrollArea className="flex-1">
        <div className="p-3">
          {/* Pinned Sessions */}
          {sortedSessions.some(s => s.isPinned) && (
            <>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-2 flex items-center gap-1.5">
                <Pin className="w-3 h-3" />
                Pinned
              </h3>
              <div className="space-y-1 mb-4">
                {sortedSessions.filter(s => s.isPinned).map(session => (
                  <SessionItem
                    key={session.id}
                    session={session}
                    isActive={session.id === currentThreadId}
                    isEditing={editingSessionId === session.id}
                    editingTitle={editingTitle}
                    onEditingTitleChange={setEditingTitle}
                    onSwitch={switchSession}
                    onStartEdit={startEditing}
                    onSaveEdit={renameSession}
                    onTogglePin={togglePinSession}
                    onDelete={requestDeleteSession}
                    onActionsToggle={setSessionActionsOpen}
                    isActionsOpen={sessionActionsOpen === session.id}
                  />
                ))}
              </div>
              <Separator className="mb-4" />
            </>
          )}

          {/* Recent Sessions */}
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-2 flex items-center gap-1.5">
            <Sparkles className="w-3 h-3" />
            Recent
          </h3>
          <div className="space-y-1">
            {sortedSessions.filter(s => !s.isPinned).length === 0 ? (
              <div className="text-center py-8 px-2">
                <MessageSquare className="w-8 h-8 mx-auto text-muted-foreground/50 mb-2" />
                <p className="text-xs text-muted-foreground">
                  No recent chats
                </p>
                <p className="text-[10px] text-muted-foreground/70 mt-1">
                  Start a new conversation
                </p>
              </div>
            ) : (
              sortedSessions.filter(s => !s.isPinned).map(session => (
                <SessionItem
                  key={session.id}
                  session={session}
                  isActive={session.id === currentThreadId}
                  isEditing={editingSessionId === session.id}
                  editingTitle={editingTitle}
                  onEditingTitleChange={setEditingTitle}
                  onSwitch={switchSession}
                  onStartEdit={startEditing}
                  onSaveEdit={renameSession}
                  onTogglePin={togglePinSession}
                  onDelete={requestDeleteSession}
                  onActionsToggle={setSessionActionsOpen}
                  isActionsOpen={sessionActionsOpen === session.id}
                />
              ))
            )}
          </div>
        </div>
      </ScrollArea>

      {/* Thread Info Footer */}
      <div className="p-3 border-t border-border bg-muted/30">
        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
          <span>Thread ID</span>
          <Badge variant="outline" className="font-mono text-[10px] px-1.5 py-0">
            {currentThreadId.slice(0, THREAD_ID_DISPLAY_LENGTH)}
          </Badge>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// Session Item Sub-component
// ============================================================================

interface SessionItemProps {
  session: ChatSession
  isActive: boolean
  isEditing: boolean
  editingTitle: string
  onEditingTitleChange: (title: string) => void
  onSwitch: (sessionId: string) => void
  onStartEdit: (sessionId: string, title: string) => void
  onSaveEdit: (sessionId: string, title: string) => void
  onTogglePin: (sessionId: string) => void
  onDelete: (sessionId: string) => void
  onActionsToggle: (sessionId: string | null) => void
  isActionsOpen: boolean
}

function SessionItem({
  session,
  isActive,
  isEditing,
  editingTitle,
  onEditingTitleChange,
  onSwitch,
  onStartEdit,
  onSaveEdit,
  onTogglePin,
  onDelete,
  onActionsToggle,
  isActionsOpen,
}: SessionItemProps) {
  const SessionIcon = getAgentIconComponent(session.agentId)

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && editingTitle.trim()) {
        onSaveEdit(session.id, editingTitle.trim())
      } else if (e.key === "Escape") {
        onEditingTitleChange("")
        onActionsToggle(null)
      }
    },
    [
      editingTitle,
      session.id,
      onSaveEdit,
      onEditingTitleChange,
      onActionsToggle,
    ]
  )

  const handleSaveEdit = useCallback(() => {
    if (editingTitle.trim()) {
      onSaveEdit(session.id, editingTitle.trim())
    }
  }, [editingTitle, session.id, onSaveEdit])

  const handleToggleActions = useCallback(() => {
    onActionsToggle(isActionsOpen ? null : session.id)
  }, [isActionsOpen, session.id, onActionsToggle])

  const handleClick = useCallback(() => {
    if (!isEditing) {
      onSwitch(session.id)
    }
  }, [isEditing, session.id, onSwitch])

  return (
    <div
      className={`
        group flex items-center gap-2 px-3 py-2.5 rounded-lg transition-all duration-200
        ${
          isActive
            ? "bg-primary text-primary-foreground shadow-sm"
            : "hover:bg-accent/80 text-muted-foreground hover:text-foreground"
        }
        ${!isEditing ? "cursor-pointer" : ""}
      `}
      onClick={handleClick}
    >
      {session.isPinned && <Pin className="w-3 h-3 shrink-0 fill-current" />}
      <SessionIcon className="w-4 h-4 shrink-0" />

      {isEditing ? (
        <div className="flex-1 flex items-center gap-1.5">
          <input
            type="text"
            value={editingTitle}
            onChange={e => onEditingTitleChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onClick={e => e.stopPropagation()}
            className="flex-1 text-xs bg-background border border-input rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-0"
            autoFocus
          />
          <button
            onClick={handleSaveEdit}
            className="p-1.5 bg-green-500 hover:bg-green-600 text-white rounded-md transition-colors"
          >
            <Check className="w-3 h-3" />
          </button>
        </div>
      ) : (
        <span className="flex-1 text-xs truncate font-medium">{session.title}</span>
      )}

      {!isEditing && (
        <DropdownMenu
          open={isActionsOpen}
          onOpenChange={open => {
            if (open !== isActionsOpen) {
              handleToggleActions()
            }
          }}
        >
          <DropdownMenuTrigger asChild>
            <button
              onClick={e => {
                e.stopPropagation()
                handleToggleActions()
              }}
              className={`
                opacity-0 group-hover:opacity-100 p-1.5 hover:bg-accent/50 rounded-md transition-all
                ${isActionsOpen ? "opacity-100" : ""}
              `}
            >
              <Edit2 className="w-3 h-3" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-40"
            onClick={e => e.stopPropagation()}
          >
            <DropdownMenuItem
              onClick={() => onStartEdit(session.id, session.title)}
              className="cursor-pointer text-xs"
            >
              <Edit2 className="w-3.5 h-3.5 mr-2" />
              Rename
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onTogglePin(session.id)}
              className="cursor-pointer text-xs"
            >
              <Pin className="w-3.5 h-3.5 mr-2" />
              {session.isPinned ? "Unpin" : "Pin"}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => onDelete(session.id)}
              className="cursor-pointer text-xs text-destructive focus:text-destructive"
            >
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  )
}
