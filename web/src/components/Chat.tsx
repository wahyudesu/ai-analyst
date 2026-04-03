"use client"

import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport } from "ai"
import {
  ChartBar,
  Check,
  ChevronDown,
  Database,
  Edit2,
  Menu,
  Pin,
  Plus,
  X,
} from "lucide-react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { type ModelConfig, fetchModels } from "@/lib/api/models"
import { type Agent, useAgents, useMessages } from "@/lib/api/queries"
import { threadsClient } from "@/lib/threads-client"
import { useDatabaseConfig } from "@/lib/use-database-config"
import { MessageRenderer } from "./MessageRenderer"

interface ChatProps {
  agentId?: string
  connectionString?: string
  className?: string
}

interface ChatSession {
  id: string
  title: string
  createdAt: Date
  messageCount?: number
  agentId?: string
  isPinned?: boolean
  modelId?: string
}

interface ModelOption {
  id: string
  name: string
  provider: "zai" | "openai"
}

// Constants
const DEFAULT_AGENT_ID = "data-analyst"

// Model options - fetched from API, with fallback defaults
const FALLBACK_MODEL_OPTIONS: ModelOption[] = [
  { id: "zai-coding-plan/glm-4.5", name: "ZAI GLM 4.5", provider: "zai" },
  {
    id: "zai-coding-plan/glm-4.5-flash",
    name: "ZAI GLM 4.5 Flash",
    provider: "zai",
  },
  { id: "openai/gpt-4o-mini", name: "GPT-4o Mini", provider: "openai" },
  { id: "openai/gpt-4o", name: "GPT-4o", provider: "openai" },
  { id: "openai/o1-mini", name: "O1 Mini", provider: "openai" },
]

const DEFAULT_MODEL_ID = FALLBACK_MODEL_OPTIONS[0].id

// Agent icons mapping - stable outside component
const AGENT_ICONS: Record<string, React.ElementType> = {
  "data-analyst": Database,
  "chart-agent": ChartBar,
  "supabase-agent": Database,
} as const

function getAgentIcon(agentId?: string): React.ElementType {
  return AGENT_ICONS[agentId || DEFAULT_AGENT_ID] || Database
}

export function Chat({
  agentId: propAgentId,
  connectionString,
  className,
}: ChatProps) {
  const [input, setInput] = useState("")
  const [currentAgentId, setCurrentAgentId] = useState<string>(DEFAULT_AGENT_ID)
  const [currentModelId, setCurrentModelId] = useState<string>(DEFAULT_MODEL_ID)
  const [modelOptions, setModelOptions] = useState<ModelOption[]>(
    FALLBACK_MODEL_OPTIONS
  )
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { databaseUrl } = useDatabaseConfig()

  // Session management
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  // Delete confirmation dialog state
  const [deleteDialog, setDeleteDialog] = useState<{
    isOpen: boolean
    sessionId: string | null
    sessionTitle: string
  }>({
    isOpen: false,
    sessionId: null,
    sessionTitle: "",
  })

  // Rename dialog state
  const [renameDialog, setRenameDialog] = useState<{
    isOpen: boolean
    sessionId: string | null
    currentTitle: string
    newTitle: string
  }>({
    isOpen: false,
    sessionId: null,
    currentTitle: "",
    newTitle: "",
  })

  // Session actions menu state
  const [sessionActionsOpen, setSessionActionsOpen] = useState<string | null>(
    null
  )

  // Inline rename state
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState("")

  // Model selector open state
  const [modelSelectorOpen, setModelSelectorOpen] = useState(false)

  // Get or create thread ID for session management
  const threadIdRef = useRef<string>(threadsClient.getOrCreateThreadId())
  const threadId = threadIdRef.current

  const resourceId = threadsClient.getResourceId()

  // Fetch all agents using shared query hook
  const { data: allAgents = [] } = useAgents()

  // Memoize transport to prevent useChat from re-initializing
  // Use a ref to track current values without triggering re-creation
  const transportParamsRef = useRef({
    agentId: currentAgentId,
    modelId: currentModelId,
    threadId,
    resourceId,
    databaseUrl,
  })

  // Update ref when values change (doesn't trigger re-render)
  transportParamsRef.current = {
    agentId: currentAgentId,
    modelId: currentModelId,
    threadId,
    resourceId,
    databaseUrl,
  }

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: `/api/chat?agentId=${currentAgentId}`,
        prepareSendMessagesRequest: ({ messages }) => ({
          body: {
            messages,
            memory: {
              thread: { id: transportParamsRef.current.threadId },
              ...(transportParamsRef.current.resourceId && {
                resource: transportParamsRef.current.resourceId,
              }),
            },
            // Always include databaseUrl from current ref value
            ...(databaseUrl && {
              databaseUrl: databaseUrl,
            }),
            ...(transportParamsRef.current.modelId && {
              modelId: transportParamsRef.current.modelId,
            }),
          },
        }),
      }),
    [currentAgentId, currentModelId, databaseUrl]
  )

  const { messages, status, sendMessage, error, setMessages } = useChat({
    transport,
  })

  const isLoading = status === "streaming" || status === "submitted"

  // Get current agent info
  const currentAgentInfo = useMemo(
    () => allAgents.find(a => a.id === currentAgentId) || null,
    [allAgents, currentAgentId]
  )

  // Title update ref - must be before other hooks
  const titleUpdateRef = useRef<string | undefined>(undefined)
  // Track seen message IDs to skip chart animation for already-rendered messages
  const seenMessageIdsRef = useRef<Set<string>>(new Set())

  // Helper functions - declared early, stable dependencies
  const saveSessions = useCallback((updatedSessions: ChatSession[]) => {
    localStorage.setItem("chat-sessions", JSON.stringify(updatedSessions))
  }, [])

  // Initialize session - run once on mount
  useEffect(() => {
    const loadSessions = () => {
      const stored = localStorage.getItem("chat-sessions")
      if (stored) {
        const parsed = JSON.parse(stored)
        setSessions(
          parsed.map((s: any) => ({
            ...s,
            createdAt: new Date(s.createdAt),
          }))
        )
      }
    }

    const loadModels = async () => {
      try {
        const data = await fetchModels()
        setModelOptions(data.models as ModelOption[])
        // Set default model if not already set
        if (data.default && !currentModelId) {
          setCurrentModelId(data.default)
        }
      } catch (error) {
        console.error("Failed to fetch models, using fallback:", error)
        // Keep using fallback options
      }
    }

    loadSessions()
    loadModels()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Set current session ID from thread only on first mount
  const isInitializedRef = useRef(false)
  useEffect(() => {
    if (!isInitializedRef.current) {
      isInitializedRef.current = true
      setCurrentSessionId(threadId)
    }
  }, [threadId])

  // Fetch message history using shared query hook
  const { data: fetchedMessages, isLoading: isLoadingMessagesQuery } =
    useMessages(threadId, currentAgentId)

  // Update messages when fetched data changes
  useEffect(() => {
    if (fetchedMessages) {
      setMessages(fetchedMessages)
      // Mark all fetched messages as seen (skip chart animation for these)
      fetchedMessages.forEach((m: { id?: string }) => {
        if (m.id) seenMessageIdsRef.current.add(m.id)
      })
    }
  }, [fetchedMessages])

  // Clear seen message IDs when switching sessions
  useEffect(() => {
    seenMessageIdsRef.current.clear()
  }, [threadId])

  const isLoadingMessages = isLoadingMessagesQuery

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // Update session title - with proper guard
  // Use ref for currentAgentId to avoid re-running this effect when agent changes
  const agentIdRef = useRef(currentAgentId)
  agentIdRef.current = currentAgentId

  useEffect(() => {
    // Only update title if we haven't already for this session
    if (messages.length > 0 && currentSessionId) {
      if (titleUpdateRef.current === currentSessionId) return

      const firstUserMessage = messages.find(m => m.role === "user")
      if (firstUserMessage) {
        const content =
          firstUserMessage.parts?.find(p => p.type === "text")?.text ||
          (firstUserMessage as any).content ||
          "New Chat"
        const title = String(content).slice(0, 50)

        // Use functional update to avoid dependency on sessions
        setSessions(prev => {
          // Check if session already exists with this title to avoid update
          const existing = prev.find(s => s.id === currentSessionId)
          if (existing && existing.title === title) {
            // Still mark as updated to prevent re-checking
            return prev
          }

          let updated
          if (existing) {
            updated = prev.map(s =>
              s.id === currentSessionId ? { ...s, title } : s
            )
          } else {
            const newSession: ChatSession = {
              id: currentSessionId,
              title: title || "New Chat",
              createdAt: new Date(),
              agentId: agentIdRef.current || DEFAULT_AGENT_ID,
            }
            updated = [newSession, ...prev]
          }

          // Save to localStorage directly to avoid dependency on saveSessions callback
          localStorage.setItem("chat-sessions", JSON.stringify(updated))
          return updated
        })

        titleUpdateRef.current = currentSessionId
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, currentSessionId])

  // Other callbacks
  const startNewChat = useCallback((agentId?: string) => {
    const agentToUse = agentId || DEFAULT_AGENT_ID

    threadsClient.clearCurrentThreadId()
    const newThreadId = threadsClient.getOrCreateThreadId()
    threadIdRef.current = newThreadId
    setCurrentSessionId(newThreadId)
    setCurrentAgentId(agentToUse)
    setMessages([])
    setInput("")
    titleUpdateRef.current = undefined
    setIsSidebarOpen(false)
    // Reset to default model for new chat
    setCurrentModelId(DEFAULT_MODEL_ID)
  }, [])

  const switchSession = useCallback(
    async (sessionId: string, sessionAgentId?: string) => {
      threadsClient.setCurrentThreadId(sessionId)
      threadIdRef.current = sessionId
      setCurrentSessionId(sessionId)

      const agentToUse = sessionAgentId || DEFAULT_AGENT_ID
      setCurrentAgentId(agentToUse)

      // useMessages hook will handle fetching when threadId/agentId changes
      titleUpdateRef.current = undefined
    },
    []
  )

  const confirmDeleteSession = useCallback(
    (sessionId: string, e: React.MouseEvent) => {
      e.stopPropagation()
      // Find session from current state (not from dependency)
      setDeleteDialog(prev => {
        const session = sessions.find(s => s.id === sessionId)
        return {
          isOpen: true,
          sessionId,
          sessionTitle: session?.title || "This chat",
        }
      })
    },
    [sessions]
  )

  const deleteSession = useCallback(
    (sessionId: string) => {
      setSessions(prev => {
        const updated = prev.filter(s => s.id !== sessionId)
        saveSessions(updated)
        return updated
      })

      if (sessionId === currentSessionId) {
        // Start new chat with default agent when current session is deleted
        startNewChat(DEFAULT_AGENT_ID)
      }

      // Close dialog
      setDeleteDialog({ isOpen: false, sessionId: null, sessionTitle: "" })
    },
    [currentSessionId, saveSessions, startNewChat]
  )

  const pinSession = useCallback(
    (sessionId: string) => {
      setSessions(prev => {
        const session = prev.find(s => s.id === sessionId)
        if (!session) return prev

        const updated = prev.map(s =>
          s.id === sessionId ? { ...s, isPinned: !s.isPinned } : s
        )
        saveSessions(updated)
        return updated
      })
    },
    [saveSessions]
  )

  const openRenameDialog = useCallback(
    (sessionId: string) => {
      const session = sessions.find(s => s.id === sessionId)
      if (!session) return

      setRenameDialog({
        isOpen: true,
        sessionId,
        currentTitle: session.title,
        newTitle: session.title,
      })
    },
    [sessions]
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

      // Close dialog
      setRenameDialog({
        isOpen: false,
        sessionId: null,
        currentTitle: "",
        newTitle: "",
      })
    },
    [saveSessions]
  )

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (input.trim()) {
      sendMessage({ text: input })
      setInput("")
    }
  }

  // Current agent icon (memoized)
  const AgentIcon = useMemo(
    () => getAgentIcon(currentAgentId),
    [currentAgentId]
  )

  return (
    <div className={`flex h-full ${className || ""}`}>
      {/* Sidebar Toggle Button (Mobile) */}
      <button
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className="lg:hidden fixed top-20 left-4 z-50 p-2 bg-white dark:bg-zinc-800 rounded-lg shadow-md border border-zinc-200 dark:border-zinc-700"
        aria-label="Toggle sidebar"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Sidebar - Chat History */}
      <aside
        className={`
        fixed lg:relative inset-y-0 left-0 z-40
        w-72 bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800
        transform transition-transform duration-200 ease-in-out
        ${isSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
      `}
      >
        <div className="flex flex-col h-full p-4">
          {/* New Chat with Agent Selection */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="w-full justify-start bg-orange-600 text-white hover:bg-orange-700 transition-colors mb-4">
                <Plus className="w-5 h-5 mr-2" />
                <span className="font-medium">New Chat</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              {allAgents.map(agent => {
                const Icon = getAgentIcon(agent.id)
                const isSelected = agent.id === currentAgentId
                return (
                  <DropdownMenuItem
                    key={agent.id}
                    onClick={() => startNewChat(agent.id)}
                    className="cursor-pointer"
                  >
                    <Icon className="w-4 h-4 mr-2" />
                    <div className="flex flex-col">
                      <span className="font-medium">{agent.name}</span>
                      <span className="text-xs text-zinc-500">
                        {agent.description}
                      </span>
                    </div>
                    {isSelected && (
                      <div className="ml-auto">
                        <div className="w-2 h-2 bg-orange-500 rounded-full" />
                      </div>
                    )}
                  </DropdownMenuItem>
                )
              })}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Sessions List */}
          <div className="flex-1 overflow-y-auto">
            <h3 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2">
              Recent Chats
            </h3>
            <div className="space-y-1">
              {sessions.length === 0 ? (
                <p className="text-sm text-zinc-500 dark:text-zinc-400 text-center py-4">
                  No chat history yet
                </p>
              ) : (
                sessions
                  .sort((a, b) => {
                    // Pinned sessions first
                    if (a.isPinned && !b.isPinned) return -1
                    if (!a.isPinned && b.isPinned) return 1
                    // Then by date (newest first)
                    return b.createdAt.getTime() - a.createdAt.getTime()
                  })
                  .map(session => {
                    const SessionIcon = getAgentIcon(session.agentId)
                    const isEditing = editingSessionId === session.id
                    return (
                      <div
                        key={session.id}
                        className={`
                          group flex items-center gap-2 px-3 py-2 rounded-lg transition-colors
                          ${
                            currentSessionId === session.id
                              ? "bg-orange-100 dark:bg-orange-900/30/30 text-orange-700 dark:text-orange-300"
                              : "hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                          }
                          ${!isEditing ? "cursor-pointer" : ""}
                        `}
                        onClick={() =>
                          !isEditing &&
                          switchSession(session.id, session.agentId)
                        }
                      >
                        {session.isPinned && (
                          <Pin className="w-3 h-3 text-orange-500 shrink-0" />
                        )}
                        <SessionIcon className="w-4 h-4 shrink-0" />

                        {/* Title or inline edit input */}
                        {isEditing ? (
                          <div className="flex-1 flex items-center gap-1">
                            <input
                              type="text"
                              value={editingTitle}
                              onChange={e => setEditingTitle(e.target.value)}
                              onKeyDown={e => {
                                if (e.key === "Enter" && editingTitle.trim()) {
                                  renameSession(session.id, editingTitle.trim())
                                  setEditingSessionId(null)
                                } else if (e.key === "Escape") {
                                  setEditingSessionId(null)
                                }
                              }}
                              onClick={e => e.stopPropagation()}
                              className="flex-1 text-sm bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-600 rounded px-1.5 py-0.5 text-zinc-900 dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-orange-500"
                              autoFocus
                            />
                            <button
                              onClick={e => {
                                e.stopPropagation()
                                if (editingTitle.trim()) {
                                  renameSession(session.id, editingTitle.trim())
                                }
                                setEditingSessionId(null)
                              }}
                              className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded"
                              title="Save"
                            >
                              <Check className="w-4 h-4 text-green-600" />
                            </button>
                          </div>
                        ) : (
                          <span className="flex-1 text-sm truncate">
                            {session.title}
                          </span>
                        )}

                        {/* Edit button with dropdown menu - only show when not editing */}
                        {!isEditing && (
                          <DropdownMenu
                            open={sessionActionsOpen === session.id}
                            onOpenChange={open =>
                              setSessionActionsOpen(open ? session.id : null)
                            }
                          >
                            <DropdownMenuTrigger asChild>
                              <button
                                onClick={e => {
                                  e.stopPropagation()
                                  setSessionActionsOpen(
                                    sessionActionsOpen === session.id
                                      ? null
                                      : session.id
                                  )
                                }}
                                className={`opacity-0 group-hover:opacity-100 p-1.5 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded transition-opacity ${
                                  sessionActionsOpen === session.id
                                    ? "opacity-100"
                                    : ""
                                }`}
                                aria-label="Edit chat"
                              >
                                <Edit2 className="w-4 h-4 text-zinc-500" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                              align="end"
                              className="w-40"
                              onClick={e => e.stopPropagation()}
                            >
                              <DropdownMenuItem
                                onClick={() => {
                                  setEditingTitle(session.title)
                                  setEditingSessionId(session.id)
                                  setSessionActionsOpen(null)
                                }}
                                className="cursor-pointer"
                              >
                                Rename
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  pinSession(session.id)
                                  setSessionActionsOpen(null)
                                }}
                                className="cursor-pointer"
                              >
                                {session.isPinned ? "Unpin" : "Pin"}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  confirmDeleteSession(session.id, {
                                    stopPropagation: () => {},
                                  } as any)
                                  setSessionActionsOpen(null)
                                }}
                                className="cursor-pointer text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400"
                              >
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    )
                  })
              )}
            </div>
          </div>

          {/* Thread Info */}
          <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800">
            <div className="text-xs text-zinc-500 dark:text-zinc-400 space-y-1">
              <p>
                Thread:{" "}
                <span className="font-mono">{threadId.slice(0, 8)}...</span>
              </p>
              <p>
                Resource: <span className="font-mono">{resourceId}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Close Sidebar Button (Mobile) */}
        <button
          onClick={() => setIsSidebarOpen(false)}
          className="lg:hidden absolute top-4 right-4 p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg"
          aria-label="Close sidebar"
        >
          <X className="w-5 h-5" />
        </button>
      </aside>

      {/* Overlay for mobile sidebar */}
      {isSidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-30"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full text-center">
              <div className="max-w-2xl">
                <div className="w-16 h-16 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                  <AgentIcon className="w-8 h-8 text-orange-600 dark:text-orange-400" />
                </div>
                <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50 mb-2">
                  {currentAgentInfo?.name || "AI Agent"}
                </h2>
                <p className="text-zinc-600 dark:text-zinc-400">
                  {currentAgentInfo?.description ||
                    "Start a conversation with the AI agent."}
                </p>
                <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-4">
                  Session: {threadId}
                </p>
              </div>
            </div>
          ) : (
            <>
              {messages.map((message, index) => {
                // Skip animation for messages that were already seen (loaded from history)
                const isNewMessage =
                  message.id && !seenMessageIdsRef.current.has(message.id)
                if (message.id && isNewMessage) {
                  seenMessageIdsRef.current.add(message.id)
                }
                return (
                  <MessageRenderer
                    key={message.id || index}
                    message={message as any}
                    agentInfo={currentAgentInfo}
                    sessionId={currentSessionId || undefined}
                    onRename={() =>
                      currentSessionId && openRenameDialog(currentSessionId)
                    }
                    onPin={() =>
                      currentSessionId && pinSession(currentSessionId)
                    }
                    onDelete={() =>
                      currentSessionId &&
                      confirmDeleteSession(currentSessionId, {
                        stopPropagation: () => {},
                      } as any)
                    }
                    skipAnimation={!isNewMessage}
                  />
                )
              })}
              {error && (
                <div className="p-3 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 rounded-lg">
                  Error: {error.message}
                </div>
              )}
              <div ref={messagesEndRef} />
            </>
          )}
          {(isLoading || isLoadingMessages) && (
            <div className="flex flex-col items-center gap-3 py-8">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce delay-100" />
                <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce delay-200" />
              </div>
              <span className="text-sm text-zinc-600 dark:text-zinc-400 animate-pulse">
                {isLoading
                  ? "AI is working on your query..."
                  : "Loading messages..."}
              </span>
            </div>
          )}
        </div>

        {/* Input */}
        <form
          onSubmit={onSubmit}
          className="border-t border-zinc-200 dark:border-zinc-800 px-6 py-4"
        >
          <div className="flex gap-2 items-center">
            {/* Model Selector */}
            <DropdownMenu
              open={modelSelectorOpen}
              onOpenChange={setModelSelectorOpen}
            >
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors flex items-center gap-2 min-w-[140px] justify-between"
                  disabled={isLoading}
                >
                  <span className="text-sm truncate">
                    {modelOptions.find(m => m.id === currentModelId)?.name ||
                      "Select Model"}
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 text-zinc-500 transition-transform ${modelSelectorOpen ? "rotate-180" : ""}`}
                  />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                <div className="px-2 py-1.5 text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                  ZAI Models
                </div>
                {modelOptions
                  .filter(m => m.provider === "zai")
                  .map(model => (
                    <DropdownMenuItem
                      key={model.id}
                      onClick={() => setCurrentModelId(model.id)}
                      className={`cursor-pointer ${currentModelId === model.id ? "bg-orange-50 dark:bg-orange-900/20" : ""}`}
                    >
                      <span className="flex-1">{model.name}</span>
                      {currentModelId === model.id && (
                        <div className="w-2 h-2 bg-orange-500 rounded-full" />
                      )}
                    </DropdownMenuItem>
                  ))}
                <DropdownMenuSeparator />
                <div className="px-2 py-1.5 text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                  OpenAI Models
                </div>
                {modelOptions
                  .filter(m => m.provider === "openai")
                  .map(model => (
                    <DropdownMenuItem
                      key={model.id}
                      onClick={() => setCurrentModelId(model.id)}
                      className={`cursor-pointer ${currentModelId === model.id ? "bg-orange-50 dark:bg-orange-900/20" : ""}`}
                    >
                      <span className="flex-1">{model.name}</span>
                      {currentModelId === model.id && (
                        <div className="w-2 h-2 bg-orange-500 rounded-full" />
                      )}
                    </DropdownMenuItem>
                  ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Type a message..."
              disabled={isLoading}
              className="flex-1 px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 placeholder-zinc-400 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:bg-zinc-400 disabled:cursor-not-allowed"
            >
              Send
            </button>
          </div>
        </form>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialog.isOpen}
        onOpenChange={open =>
          setDeleteDialog(prev => ({ ...prev, isOpen: open }))
        }
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Chat</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{deleteDialog.sessionTitle}"?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() =>
                setDeleteDialog({
                  isOpen: false,
                  sessionId: null,
                  sessionTitle: "",
                })
              }
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() =>
                deleteDialog.sessionId && deleteSession(deleteDialog.sessionId)
              }
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename Dialog */}
      <Dialog
        open={renameDialog.isOpen}
        onOpenChange={open =>
          setRenameDialog(prev => ({ ...prev, isOpen: open }))
        }
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Chat</DialogTitle>
            <DialogDescription>
              Enter a new name for this chat session.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <label
              htmlFor="chat-title"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Chat Title
            </label>
            <Input
              id="chat-title"
              value={renameDialog.newTitle}
              onChange={e =>
                setRenameDialog(prev => ({ ...prev, newTitle: e.target.value }))
              }
              placeholder="Enter chat title..."
              maxLength={100}
              className="mt-2"
              onKeyDown={e => {
                if (e.key === "Enter" && renameDialog.newTitle.trim()) {
                  renameDialog.sessionId &&
                    renameSession(
                      renameDialog.sessionId,
                      renameDialog.newTitle.trim()
                    )
                }
              }}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() =>
                setRenameDialog({
                  isOpen: false,
                  sessionId: null,
                  currentTitle: "",
                  newTitle: "",
                })
              }
            >
              Cancel
            </Button>
            <Button
              onClick={() =>
                renameDialog.sessionId &&
                renameSession(
                  renameDialog.sessionId,
                  renameDialog.newTitle.trim()
                )
              }
              disabled={!renameDialog.newTitle.trim()}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
