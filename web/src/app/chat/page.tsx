"use client"

import { Bot, Loader2, Send } from "lucide-react"
import { useSearchParams } from "next/navigation"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { threadsClient } from "@/lib/threads-client"

// AI Elements components
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation"
import {
  Message,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message"

// UI components
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

// AI SDK for chat functionality
import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport } from "ai"

// Constants
const DEFAULT_AGENT_ID = "data-analyst"
const DEFAULT_MODEL_ID = "minimax/MiniMax-M2.7"
const CHAT_SESSIONS_KEY = "chat-sessions"

const MODEL_OPTIONS = [
  { id: "minimax/MiniMax-M2.7", name: "MiniMax M2.7" },
  { id: "openai/gpt-4o-mini", name: "GPT-4o Mini" },
  { id: "openai/gpt-4o", name: "GPT-4o" },
]

interface ChatSession {
  id: string
  title: string
  createdAt: Date
  agentId?: string
  isPinned?: boolean
}

// Helper functions for session management
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

function addSessionToStorage(session: ChatSession): void {
  const sessions = loadSessionsFromStorage()
  // Check if session already exists
  const existingIndex = sessions.findIndex(s => s.id === session.id)
  if (existingIndex >= 0) {
    sessions[existingIndex] = session
  } else {
    sessions.unshift(session)
  }
  saveSessionsToStorage(sessions)
}

function ChatPage() {
  const searchParams = useSearchParams()
  const connectionString = searchParams.get("connection") ?? undefined
  const [currentModelId, setCurrentModelId] = useState(DEFAULT_MODEL_ID)
  const [input, setInput] = useState("")
  const [isInitialized, setIsInitialized] = useState(false)

  // Use ref to store thread ID - ensures stability across renders
  const threadIdRef = useRef<string>(threadsClient.getOrCreateThreadId())
  const threadId = threadIdRef.current

  // Get resource ID (also use memo for stability)
  const resourceId = useMemo(() => threadsClient.getResourceId(), [])

  // Setup chat transport - memoized to prevent recreating on every render
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: `/api/chat?agentId=${DEFAULT_AGENT_ID}`,
        prepareSendMessagesRequest: ({ messages }) => ({
          body: {
            messages,
            memory: {
              thread: { id: threadId },
              resource: resourceId,
            },
            ...(connectionString && {
              databaseUrl: connectionString,
            }),
            modelId: currentModelId,
          },
        }),
      }),
    [threadId, resourceId, connectionString, currentModelId],
  )

  const { messages, status, sendMessage, error, stop, setMessages } = useChat({
    transport,
  })

  // Load messages from localStorage on mount and when threadId changes
  useEffect(() => {
    const storedMessages = threadsClient.getMessages(threadId)
    if (storedMessages.length > 0) {
      // Convert stored messages to AI SDK format
      const aiMessages = storedMessages.map((m) => ({
        id: m.id,
        role: m.role as "user" | "assistant",
        parts: [{ type: "text" as const, text: m.content }],
      }))
      setMessages(aiMessages as any)
    }
    setIsInitialized(true)
  }, [threadId, setMessages])

  // Save messages to localStorage when they change
  useEffect(() => {
    if (!isInitialized) return
    if (messages.length > 0) {
      const messagesToSave = messages.map((m) => {
        const textPart = m.parts?.find((p: any) => p?.type === "text") as any
        return {
          id: m.id,
          role: m.role as "user" | "assistant" | "system",
          content: textPart?.text || "",
          createdAt: new Date(),
        }
      })
      threadsClient.saveMessages(threadId, messagesToSave)

      // Add/update session in ChatSidebar with first message as title
      const firstUserMessage = messages.find(m => m.role === "user")
      if (firstUserMessage) {
        const textPart = firstUserMessage.parts?.find((p: any) => p?.type === "text") as any
        const title = textPart?.text?.slice(0, 50) || "New Chat"
        const session: ChatSession = {
          id: threadId,
          title: title + (title.length >= 50 ? "..." : ""),
          createdAt: new Date(),
          agentId: DEFAULT_AGENT_ID,
          isPinned: false,
        }
        addSessionToStorage(session)
      }
    }
  }, [messages, threadId, isInitialized])

  const isLoading = status === "streaming" || status === "submitted"

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return
    sendMessage({ text: input })
    setInput("")
  }

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Chat Area */}
      <div className="flex-1 min-h-0">
        <Conversation>
          <ConversationContent>
            {messages.length === 0 ? (
              <ConversationEmptyState
                icon={
                  <div className="w-20 h-20 bg-linear-to-br from-primary/20 to-primary/5 rounded-2xl flex items-center justify-center shadow-sm">
                    <Bot className="w-10 h-10 text-primary" />
                  </div>
                }
                title="AI Data Analyst"
                description="Ask questions about your database using natural language. Get instant insights with visualizations."
              />
            ) : (
              <>
                {messages.map((message) => (
                  <Message
                    key={message.id}
                    from={message.role === "user" ? "user" : "assistant"}
                  >
                    <MessageContent>
                      {message.parts?.map((part, index) => {
                        if (part.type === "text") {
                          return (
                            <MessageResponse key={index}>
                              {part.text}
                            </MessageResponse>
                          );
                        }
                        return null;
                      })}
                    </MessageContent>
                  </Message>
                ))}
                {error && (
                  <div className="mx-auto max-w-lg">
                    <div className="p-4 bg-destructive/10 border border-destructive/20 text-destructive rounded-xl">
                      <p className="text-sm font-medium">Error</p>
                      <p className="text-xs mt-1 opacity-90">{error.message}</p>
                    </div>
                  </div>
                )}
              </>
            )}
          </ConversationContent>

          {/* Loading state */}
          {isLoading && (
            <Message from="assistant">
              <MessageContent>
                <div className="flex items-center gap-3 text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">Analyzing your data...</span>
                </div>
              </MessageContent>
            </Message>
          )}

          {/* Scroll to bottom button */}
          <ConversationScrollButton />
        </Conversation>
      </div>

      {/* Input Area - Floating */}
      <div className="p-4 shrink-0">
        <form onSubmit={handleSubmit} className="mx-auto max-w-3xl">
          {/* Floating Input Container */}
          <div className="relative bg-background/80 backdrop-blur-md rounded-2xl shadow-lg border p-3">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about your data... (e.g., 'Show me all tables')"
              className="min-h-14 max-h-48 resize-none shadow-none border-0 focus-visible:ring-0 bg-transparent px-2 mb-2"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
            />

            {/* Bottom row: Model Selector + Submit Button */}
            <div className="flex items-center justify-between">
              <Select value={currentModelId} onValueChange={setCurrentModelId}>
                <SelectTrigger className="w-auto h-8 rounded-lg px-4 text-sm border border-input">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent position="popper">
                  {MODEL_OPTIONS.map((model) => (
                    <SelectItem key={model.id} value={model.id}>
                      {model.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                type="submit"
                size="icon"
                disabled={isLoading || !input.trim()}
                className="rounded-full h-9 w-9 shrink-0"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Chat() {
  return <ChatPage />;
}
