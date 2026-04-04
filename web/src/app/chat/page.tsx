"use client"

import { SettingsDialog } from "@/components/SettingsDialog"
import { Button } from "@/components/ui/button"
import { Database, Settings } from "lucide-react"
import { useSearchParams } from "next/navigation"
import { useState } from "react"

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
  PromptInputTextarea,
  PromptInputSubmit,
  PromptInputTools,
} from "@/components/ai-elements/prompt-input"

// AI SDK for chat functionality
import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport } from "ai"

// Constants
const DEFAULT_AGENT_ID = "data-analyst"
const DEFAULT_MODEL_ID = "zai-coding-plan/glm-4.5"

const MODEL_OPTIONS = [
  { id: "zai-coding-plan/glm-4.5", name: "GLM 4.5" },
  { id: "zai-coding-plan/glm-4.5-flash", name: "GLM 4.5 Flash" },
  { id: "openai/gpt-4o-mini", name: "GPT-4o Mini" },
  { id: "openai/gpt-4o", name: "GPT-4o" },
]

function ChatPage() {
  const searchParams = useSearchParams()
  const connectionString = searchParams.get("connection") ?? undefined
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [currentModelId, setCurrentModelId] = useState(DEFAULT_MODEL_ID)

  // Create thread ID for session
  const threadId = crypto.randomUUID?.() || Math.random().toString(36).substring(2)
  const resourceId = "default-user"

  // Setup chat transport
  const transport = new DefaultChatTransport({
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
  })

  const { messages, status, sendMessage, error, stop } = useChat({
    transport,
  })

  const isLoading = status === "streaming" || status === "submitted"

  const handleSubmit = ({ text }: { text: string }) => {
    sendMessage({ text })
  }

  return (
    <div className="flex flex-col h-full">
      {/* Chat Header */}
      <header className="border-b border-border bg-card px-6 py-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
              <Database className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-foreground">
                AI Data Analyst
              </h1>
              <p className="text-xs text-muted-foreground">
                Query your database with natural language
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsSettingsOpen(true)}
            >
              <Settings className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Chat Area */}
      <div className="flex-1 min-h-0">
        <Conversation>
          <ConversationContent>
            {messages.length === 0 ? (
              <ConversationEmptyState
                icon={
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                    <Database className="w-8 h-8 text-primary" />
                  </div>
                }
                title="AI Data Analyst"
                description="Ask questions about your database using natural language."
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
                            <div key={index} className="prose prose-sm max-w-none">
                              {part.text}
                            </div>
                          )
                        }
                        return null
                      })}
                    </MessageContent>
                  </Message>
                ))}
                {error && (
                  <div className="p-4 bg-destructive/10 text-destructive rounded-lg">
                    Error: {error.message}
                  </div>
                )}
              </>
            )}
          </ConversationContent>

          {/* Loading state */}
          {isLoading && (
            <Message from="assistant">
              <MessageContent>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  <span className="text-sm">Thinking...</span>
                </div>
              </MessageContent>
            </Message>
          )}

          {/* Scroll to bottom button */}
          <ConversationScrollButton />
        </Conversation>
      </div>

      {/* Input Area */}
      <div className="border-t border-border bg-card p-4 flex-shrink-0">
        <PromptInput onSubmit={handleSubmit}>
          <PromptInputBody>
            {/* Model Selector */}
            <PromptInputHeader>
              <select
                className="px-3 py-1.5 border border-input rounded-md bg-background hover:bg-accent transition-colors flex items-center gap-2 min-w-[140px] text-sm"
                disabled={isLoading}
                value={currentModelId}
                onChange={(e) => setCurrentModelId(e.target.value)}
              >
                {MODEL_OPTIONS.map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.name}
                  </option>
                ))}
              </select>
            </PromptInputHeader>

            {/* Text Input */}
            <PromptInputTextarea
              value={messages[messages.length - 1]?.parts?.find((p: { type: string }) => p.type === "text")?.text || ""}
              onChange={(e) => {
                const textarea = e.currentTarget
                textarea.value = e.currentTarget.value
              }}
              placeholder="Ask about your data... (e.g., 'Show me all tables')"
              disabled={isLoading}
            />

            {/* Footer with submit button */}
            <PromptInputFooter>
              <PromptInputTools />
              <PromptInputSubmit status={status} onStop={() => stop()} />
            </PromptInputFooter>
          </PromptInputBody>
        </PromptInput>
      </div>

      <SettingsDialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen} />
    </div>
  )
}

export default function Chat() {
  return <ChatPage />
}
