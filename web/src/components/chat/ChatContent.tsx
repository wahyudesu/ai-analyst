"use client"

import { useChat } from "@ai-sdk/react"
import type { FileUIPart } from "ai"
import { DefaultChatTransport } from "ai"
import { ChevronDown, Database, Loader2, Send, Sparkles } from "lucide-react"
import type { FormEvent } from "react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"

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

// AI Elements components
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation"
import { Message, MessageContent } from "@/components/ai-elements/message"
import {
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  PromptInputHeader,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
} from "@/components/ai-elements/prompt-input"

// ============================================================================
// Types & Constants
// ============================================================================

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

const DEFAULT_AGENT_ID = "data-analyst"

// Static icon component - hoisted outside for better performance (rendering-hoist-jsx)
const ChartBarIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M3 3v18h18" />
    <path d="M18 9l-5 5-4-4-3 3" />
  </svg>
)

const MODEL_OPTIONS: ModelOption[] = [
  { id: "zai-coding-plan/glm-4.5", name: "GLM 4.5", provider: "zai" },
  {
    id: "zai-coding-plan/glm-4.5-flash",
    name: "GLM 4.5 Flash",
    provider: "zai",
  },
  { id: "openai/gpt-4o-mini", name: "GPT-4o Mini", provider: "openai" },
  { id: "openai/gpt-4o", name: "GPT-4o", provider: "openai" },
] as const

const DEFAULT_MODEL_ID = MODEL_OPTIONS[0].id

const AGENT_ICONS = {
  "data-analyst": Database,
  "chart-agent": ChartBarIcon,
  "supabase-agent": Database,
} as const

function getAgentIcon(agentId?: string) {
  return AGENT_ICONS[agentId as keyof typeof AGENT_ICONS] || Database
}

// ============================================================================
// Main Component
// ============================================================================

export function ChatContent({
  agentId: propAgentId,
  connectionString,
  className,
}: ChatContentProps) {
  const [input, setInput] = useState("")
  const [currentAgentId, setCurrentAgentId] = useState<string>(DEFAULT_AGENT_ID)
  const [currentModelId, setCurrentModelId] = useState<string>(DEFAULT_MODEL_ID)
  const { databaseUrl } = useDatabaseConfig()

  const threadIdRef = useRef<string>(threadsClient.getOrCreateThreadId())
  const threadId = threadIdRef.current
  const resourceId = threadsClient.getResourceId()

  const [modelSelectorOpen, setModelSelectorOpen] = useState(false)

  // Fetch agents
  const { data: allAgents = [] } = useAgents()

  // Transport params ref
  const transportParamsRef = useRef({
    agentId: currentAgentId,
    modelId: currentModelId,
    threadId,
    resourceId,
    databaseUrl,
  })

  transportParamsRef.current = {
    agentId: currentAgentId,
    modelId: currentModelId,
    threadId,
    resourceId,
    databaseUrl,
  }

  const { messages, status, sendMessage, error, setMessages, stop } = useChat({
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

  // Current agent info
  const currentAgentInfo = allAgents.find(a => a.id === currentAgentId) || null

  // Track seen message IDs
  const seenMessageIdsRef = useRef<Set<string>>(new Set())

  // Fetch message history
  const { data: fetchedMessages } = useMessages(threadId, currentAgentId)

  useEffect(() => {
    if (fetchedMessages) {
      setMessages(fetchedMessages)
      fetchedMessages.forEach((m: { id?: string }) => {
        if (m.id) seenMessageIdsRef.current.add(m.id)
      })
    }
  }, [fetchedMessages, setMessages])

  useEffect(() => {
    seenMessageIdsRef.current.clear()
  }, [threadId])

  // Callbacks
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
  )

  const handleAgentChange = useCallback(
    (agentId: string) => {
      setCurrentAgentId(agentId)
      startNewChat(agentId)
    },
    [startNewChat]
  )

  const handleSubmit = useCallback(
    (
      { text, files }: { text: string; files: FileUIPart[] },
      _event: FormEvent<HTMLFormElement>
    ) => {
      sendMessage({ text })
      setInput("")
    },
    [sendMessage]
  )

  const AgentIcon = useMemo(
    () => getAgentIcon(currentAgentId),
    [currentAgentId]
  )

  return (
    <div className={`flex flex-col ${className || ""}`}>
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

      {/* Chat Area with AI Elements Conversation */}
      <div className="flex-1 overflow-hidden">
        <Conversation>
          <ConversationContent>
            {messages.length === 0 ? (
              <ConversationEmptyState
                icon={
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                    <AgentIcon className="w-8 h-8 text-primary" />
                  </div>
                }
                title={currentAgentInfo?.name || "AI Data Analyst"}
                description={
                  currentAgentInfo?.description ||
                  "Ask questions about your data and get insights with visualizations."
                }
              />
            ) : (
              <>
                {messages.map((message, index) => {
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
              </>
            )}
          </ConversationContent>

          {/* Loading State */}
          {isLoading && (
            <Message from="assistant">
              <MessageContent>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">Thinking...</span>
                </div>
              </MessageContent>
            </Message>
          )}

          {/* Scroll to Bottom Button */}
          <ConversationScrollButton />
        </Conversation>
      </div>

      {/* Input Area with AI Elements PromptInput */}
      <div className="border-t border-border bg-card p-4">
        <PromptInput onSubmit={handleSubmit}>
          <PromptInputBody>
            {/* Model Selector in Header */}
            <PromptInputHeader>
              <DropdownMenu
                open={modelSelectorOpen}
                onOpenChange={setModelSelectorOpen}
              >
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="px-3 py-1.5 border border-input rounded-md bg-background hover:bg-accent transition-colors flex items-center gap-2 min-w-[120px] justify-between text-sm"
                    disabled={isLoading}
                  >
                    <span className="truncate">
                      {MODEL_OPTIONS.find(m => m.id === currentModelId)?.name ||
                        "Model"}
                    </span>
                    <ChevronDown
                      className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${modelSelectorOpen ? "rotate-180" : ""}`}
                    />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-48">
                  {MODEL_OPTIONS.map(model => (
                    <DropdownMenuItem
                      key={model.id}
                      onClick={() => setCurrentModelId(model.id)}
                      className={currentModelId === model.id ? "bg-accent" : ""}
                    >
                      <span className="flex-1 text-sm">{model.name}</span>
                      {currentModelId === model.id && (
                        <div className="w-2 h-2 bg-primary rounded-full" />
                      )}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </PromptInputHeader>

            {/* Text Area */}
            <PromptInputTextarea
              value={input}
              onChange={e => setInput(e.currentTarget.value)}
              placeholder="Ask about your data..."
            />

            {/* Footer with Submit Button */}
            <PromptInputFooter>
              <PromptInputTools />
              <PromptInputSubmit status={status} onStop={() => stop()} />
            </PromptInputFooter>
          </PromptInputBody>
        </PromptInput>
      </div>
    </div>
  )
}
