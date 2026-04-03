"use client"

import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport } from "ai"
import { ChartBar, ChevronDown, Database, Send, Sparkles } from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"

import { MessageRenderer } from "@/components/MessageRenderer"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { type Agent, useAgents, useMessages } from "@/lib/api/queries"
import { threadsClient } from "@/lib/threads-client"
import { useDatabaseConfig } from "@/lib/use-database-config"

interface ChatContentProps {
  agentId?: string
  connectionString?: string
  className?: string
}

interface ModelOption {
  id: string
  name: string
  provider: "zai" | "openai"
}

// Constants - hoisted outside component
const DEFAULT_AGENT_ID = "data-analyst"

const MODEL_OPTIONS: ModelOption[] = [
  { id: "zai-coding-plan/glm-4.5", name: "GLM 4.5", provider: "zai" },
  {
    id: "zai-coding-plan/glm-4.5-flash",
    name: "GLM 4.5 Flash",
    provider: "zai",
  },
  { id: "openai/gpt-4o-mini", name: "GPT-4o Mini", provider: "openai" },
] as const

const DEFAULT_MODEL_ID = MODEL_OPTIONS[0].id

// Agent icons mapping - hoisted outside component
const AGENT_ICONS = {
  "data-analyst": Database,
  "chart-agent": ChartBar,
  "supabase-agent": Database,
} as const

type AgentId = keyof typeof AGENT_ICONS

function getAgentIcon(agentId?: string): React.ElementType {
  return AGENT_ICONS[agentId as AgentId] || Database
}

export function ChatContent({
  agentId: propAgentId,
  connectionString,
  className,
}: ChatContentProps) {
  const [input, setInput] = useState("")
  const [currentAgentId, setCurrentAgentId] = useState<string>(DEFAULT_AGENT_ID)
  const [currentModelId, setCurrentModelId] = useState<string>(DEFAULT_MODEL_ID)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { databaseUrl } = useDatabaseConfig()

  const threadIdRef = useRef<string>(threadsClient.getOrCreateThreadId())
  const threadId = threadIdRef.current
  const resourceId = threadsClient.getResourceId()

  const [modelSelectorOpen, setModelSelectorOpen] = useState(false)

  // Fetch all agents using shared query hook
  const { data: allAgents = [] } = useAgents()

  // Transport params ref to avoid recreating transport unnecessarily
  const transportParamsRef = useRef({
    agentId: currentAgentId,
    modelId: currentModelId,
    threadId,
    resourceId,
    databaseUrl,
  })

  // Update ref without triggering re-renders
  transportParamsRef.current = {
    agentId: currentAgentId,
    modelId: currentModelId,
    threadId,
    resourceId,
    databaseUrl,
  }

  const { messages, status, sendMessage, error, setMessages } = useChat({
    transport: new DefaultChatTransport({
      api: `/api/chat?agentId=${currentAgentId}`,
      prepareSendMessagesRequest: ({ messages }) => ({
        body: {
          messages,
          memory: {
            thread: { id: threadIdRef.current },
            ...(resourceId && {
              resource: resourceId,
            }),
          },
          ...(databaseUrl && {
            databaseUrl,
          }),
          ...(transportParamsRef.current.modelId && {
            modelId: transportParamsRef.current.modelId,
          }),
        },
      }),
    }),
  })

  const isLoading = status === "streaming" || status === "submitted"

  // Direct lookup - no useMemo needed for simple find operation
  const currentAgentInfo = allAgents.find(a => a.id === currentAgentId) || null

  // Track seen message IDs to skip chart animation for already-rendered messages
  const seenMessageIdsRef = useRef<Set<string>>(new Set())

  // Fetch message history using shared query hook
  const { data: fetchedMessages } = useMessages(threadId, currentAgentId)

  // Update messages when fetched data changes
  useEffect(() => {
    if (fetchedMessages) {
      setMessages(fetchedMessages)
      // Mark all fetched messages as seen (skip chart animation for these)
      fetchedMessages.forEach((m: { id?: string }) => {
        if (m.id) seenMessageIdsRef.current.add(m.id)
      })
    }
  }, [fetchedMessages, setMessages])

  // Clear seen message IDs when switching sessions
  useEffect(() => {
    seenMessageIdsRef.current.clear()
  }, [threadId])

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // Stable callbacks - primitive dependencies only
  const startNewChat = useCallback(
    (agentId?: string) => {
      const agentToUse = agentId || DEFAULT_AGENT_ID
      threadsClient.clearCurrentThreadId()
      const newThreadId = threadsClient.getOrCreateThreadId()
      threadIdRef.current = newThreadId
      setCurrentAgentId(agentToUse)
      setMessages([])
      setInput("")
      setCurrentModelId(DEFAULT_MODEL_ID)
    },
    [setMessages]
  ) // setMessages is stable from useChat

  const handleAgentChange = useCallback(
    (agentId: string) => {
      setCurrentAgentId(agentId)
      startNewChat(agentId)
    },
    [startNewChat]
  )

  const handleSubmit = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault()
      if (input.trim()) {
        sendMessage({ text: input })
        setInput("")
      }
    },
    [input, sendMessage]
  )

  // Direct icon lookup - no useMemo needed
  const AgentIcon = getAgentIcon(currentAgentId)

  return (
    <div className={`flex flex-col h-full ${className || ""}`}>
      {/* Agent Selector Bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <Sparkles className="w-4 h-4" />
              <span>{currentAgentInfo?.name || "AI Analyst"}</span>
              <ChevronDown className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            {allAgents.map(agent => {
              const Icon = getAgentIcon(agent.id)
              const isSelected = agent.id === currentAgentId
              return (
                <DropdownMenuItem
                  key={agent.id}
                  onClick={() => handleAgentChange(agent.id)}
                  className="cursor-pointer"
                >
                  <Icon className="w-4 h-4 mr-2" />
                  <div className="flex flex-col">
                    <span className="font-medium">{agent.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {agent.description}
                    </span>
                  </div>
                  {isSelected && (
                    <div className="ml-auto">
                      <div className="w-2 h-2 bg-primary rounded-full" />
                    </div>
                  )}
                </DropdownMenuItem>
              )
            })}
          </DropdownMenuContent>
        </DropdownMenu>

        <Button variant="outline" size="sm" onClick={() => startNewChat()}>
          New Chat
        </Button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-center">
            <div className="max-w-md">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <AgentIcon className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-xl font-semibold text-foreground mb-2">
                {currentAgentInfo?.name || "AI Analyst"}
              </h2>
              <p className="text-muted-foreground">
                {currentAgentInfo?.description ||
                  "Ask questions about your data and get insights with visualizations."}
              </p>
              <p className="text-xs text-muted-foreground mt-4">
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
                  sessionId={threadId}
                  skipAnimation={!isNewMessage}
                />
              )
            })}
            {error && (
              <div className="p-4 bg-destructive/10 text-destructive rounded-lg">
                Error: {error.message}
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
        {isLoading && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" />
            <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce delay-100" />
            <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce delay-200" />
          </div>
        )}
      </div>

      {/* Input */}
      <form
        onSubmit={handleSubmit}
        className="p-4 border-t border-border bg-card"
      >
        <div className="flex gap-2 items-center max-w-4xl mx-auto">
          <DropdownMenu
            open={modelSelectorOpen}
            onOpenChange={setModelSelectorOpen}
          >
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="px-3 py-2 text-sm border border-input rounded-lg bg-background hover:bg-accent transition-colors flex items-center gap-2 min-w-[120px] justify-between"
                disabled={isLoading}
              >
                <span className="truncate">
                  {MODEL_OPTIONS.find(m => m.id === currentModelId)?.name ||
                    "Model"}
                </span>
                <ChevronDown
                  className={`w-4 h-4 text-muted-foreground transition-transform ${modelSelectorOpen ? "rotate-180" : ""}`}
                />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              {MODEL_OPTIONS.map(model => (
                <DropdownMenuItem
                  key={model.id}
                  onClick={() => setCurrentModelId(model.id)}
                  className={`cursor-pointer ${currentModelId === model.id ? "bg-accent" : ""}`}
                >
                  <span className="flex-1">{model.name}</span>
                  {currentModelId === model.id && (
                    <div className="w-2 h-2 bg-primary rounded-full" />
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <Input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Ask about your data..."
            disabled={isLoading}
            className="flex-1"
          />
          <Button
            type="submit"
            size="icon"
            disabled={isLoading || !input.trim()}
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </form>
    </div>
  )
}
