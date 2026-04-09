"use client"

import {
  Check,
  ChevronDown,
  ChevronRight,
  Copy,
  Database,
  MoreVertical,
  ThumbsDown,
  ThumbsUp,
} from "lucide-react"
import { memo, useMemo, useState } from "react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ChartRenderer, CollapsibleMultipleCharts } from "./charts"
import type { ChartConfig, MultipleChartsConfig } from "./charts/types"

import {
  Message,
  MessageAction,
  MessageContent,
  MessageResponse,
  MessageToolbar,
} from "@/components/ai-elements/message"
import {
  Tool,
  ToolContent,
  ToolHeader,
  ToolInput,
  ToolOutput,
} from "@/components/ai-elements/tool"
// AI Elements components
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import type { DynamicToolUIPart, ToolUIPart } from "ai"

// Types
interface MessageData {
  id?: string
  role: "user" | "assistant" | "system"
  content?: string
  parts?: MessagePart[]
}

interface MessagePart {
  type: string
  text?: string
  state?: ToolUIPart["state"]
  toolName?: string
  toolCallId?: string
  args?: unknown
  input?: unknown
  output?: unknown
  result?: unknown
  isError?: boolean
  errorText?: string
}

interface MessageRendererProps {
  message: MessageData
  agentInfo?: { id: string; name: string; description?: string } | null
  onRename?: () => void
  onPin?: () => void
  onDelete?: () => void
  sessionId?: string
  compact?: boolean
  skipAnimation?: boolean
}

// Helper functions
function isToolPart(part: MessagePart): boolean {
  return (
    part.type?.startsWith("tool-") ||
    ["tool-call", "tool-result", "tool-error"].includes(part.type)
  )
}

function hasChartOutput(output: unknown): boolean {
  return !!(
    output &&
    typeof output === "object" &&
    "chartType" in output &&
    "data" in output
  )
}

function hasMultipleChartsOutput(output: unknown): boolean {
  return !!(
    output &&
    typeof output === "object" &&
    "charts" in output &&
    Array.isArray((output as MultipleChartsConfig).charts)
  )
}

function extractChartConfig(parts?: MessagePart[]): ChartConfig | null {
  if (!parts) return null
  for (const part of parts) {
    if (part.state === "output-available" && hasChartOutput(part.output)) {
      return part.output as ChartConfig
    }
    if (part.result && hasChartOutput(part.result)) {
      return part.result as ChartConfig
    }
  }
  return null
}

function extractMultipleChartsConfig(
  parts?: MessagePart[]
): MultipleChartsConfig | null {
  if (!parts) return null
  for (const part of parts) {
    if (
      part.state === "output-available" &&
      hasMultipleChartsOutput(part.output)
    ) {
      return part.output as MultipleChartsConfig
    }
    if (part.result && hasMultipleChartsOutput(part.result)) {
      return part.result as MultipleChartsConfig
    }
  }
  return null
}

function extractTextContent(message: MessageData): string {
  if (message.content) return message.content
  if (message.parts) {
    return message.parts
      .filter(p => p.type === "text")
      .map(p => p.text || "")
      .join("")
  }
  return ""
}

function getToolName(part: MessagePart): string {
  return part.toolName || part.type?.replace("tool-", "") || "unknown"
}

interface ToolPartProps {
  part: MessagePart
}

function ToolPart({ part }: ToolPartProps) {
  const toolName = getToolName(part)
  const isError = part.isError ?? false
  const hasContent = Boolean(
    (part.output || part.result) && !hasChartOutput(part.output)
  )

  if (hasChartOutput(part.output) || hasMultipleChartsOutput(part.output)) {
    return null
  }

  return (
    <div
      className={`rounded-lg border overflow-hidden ${
        isError
          ? "border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/20"
          : "border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50"
      }`}
    >
      <div className="flex items-center justify-between w-full px-3 py-2">
        <div className="flex items-center gap-2">
          <div
            className={`w-2 h-2 rounded-full ${isError ? "bg-red-500" : "bg-green-500"}`}
          />
          <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
            {toolName}
          </span>
        </div>
      </div>
      {hasContent && (
        <div className="px-3 pb-2">
          <pre className="text-xs text-zinc-600 dark:text-zinc-400 overflow-x-auto max-h-64 overflow-y-auto">
            {JSON.stringify(part.output || part.result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}

// Main Component
function MessageRenderer({
  message,
  agentInfo,
  onRename,
  onPin,
  onDelete,
  skipAnimation,
}: MessageRendererProps) {
  const isUser = message.role === "user"
  const [copied, setCopied] = useState(false)
  const [liked, setLiked] = useState(false)
  const [disliked, setDisliked] = useState(false)

  const chartConfig = useMemo(
    () => extractChartConfig(message.parts),
    [message.parts]
  )
  const multipleChartsConfig = useMemo(
    () => extractMultipleChartsConfig(message.parts),
    [message.parts]
  )
  const textContent = useMemo(() => extractTextContent(message), [message])
  const toolParts = useMemo(
    () => message.parts?.filter(isToolPart) ?? [],
    [message.parts]
  )

  const handleCopy = async () => {
    await navigator.clipboard.writeText(textContent)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleLike = () => {
    if (disliked) setDisliked(false)
    setLiked(!liked)
  }

  const handleDislike = () => {
    if (liked) setLiked(false)
    setDisliked(!disliked)
  }

  return (
    <Message from={message.role}>
      <MessageContent
        className={`
          rounded-2xl px-4 py-3
          ${
            isUser
              ? "bg-primary text-primary-foreground"
              : "bg-card border border-border text-foreground shadow-sm"
          }
        `}
      >
        {/* Agent Badge */}
        {!isUser && agentInfo && (
          <div className="flex items-center gap-2 pb-2 border-b border-border/50">
            <Database className="w-3 h-3 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground">
              by {agentInfo.name}
            </span>
          </div>
        )}

        {/* Text content */}
        {textContent && <MessageResponse>{textContent}</MessageResponse>}

        {/* Tool parts - collapsed by default */}
        {toolParts.length > 0 && !isUser && (
          <div className="space-y-2">
            {toolParts.map(part => (
              <ToolPart
                key={part.toolCallId || part.toolName || part.type}
                part={part}
              />
            ))}
          </div>
        )}

        {/* Chart rendering */}
        {multipleChartsConfig && !isUser && (
          <div className="min-h-20">
            <CollapsibleMultipleCharts
              config={multipleChartsConfig}
              defaultOpen={false}
              skipAnimation={skipAnimation}
            />
          </div>
        )}
        {chartConfig && !isUser && (
          <div className="bg-white dark:bg-zinc-900 rounded-lg p-4 min-h-80">
            <ChartRenderer config={chartConfig} skipAnimation={skipAnimation} />
          </div>
        )}

        {/* Action buttons */}
        {!isUser && (
          <MessageToolbar>
            <div className="flex items-center gap-1">
              <MessageAction
                onClick={handleCopy}
                tooltip={copied ? "Copied!" : "Copy"}
              >
                {copied ? (
                  <Check className="w-4 h-4 text-green-600 dark:text-green-400" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </MessageAction>

              <MessageAction onClick={handleLike} tooltip="Like">
                <ThumbsUp
                  className={`w-4 h-4 ${liked ? "text-blue-600 dark:text-blue-400" : ""}`}
                />
              </MessageAction>

              <MessageAction onClick={handleDislike} tooltip="Dislike">
                <ThumbsDown
                  className={`w-4 h-4 ${disliked ? "text-red-600 dark:text-red-400" : ""}`}
                />
              </MessageAction>
            </div>

            {/* More actions */}
            {(onRename || onPin || onDelete) && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <MessageAction tooltip="More actions">
                    <MoreVertical className="w-4 h-4" />
                  </MessageAction>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  {onRename && (
                    <DropdownMenuItem
                      onClick={onRename}
                      className="cursor-pointer"
                    >
                      Rename chat
                    </DropdownMenuItem>
                  )}
                  {onPin && (
                    <DropdownMenuItem
                      onClick={onPin}
                      className="cursor-pointer"
                    >
                      Pin to top
                    </DropdownMenuItem>
                  )}
                  {onDelete && (
                    <DropdownMenuItem
                      onClick={onDelete}
                      className="cursor-pointer text-red-600 dark:text-red-400"
                    >
                      Delete chat
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </MessageToolbar>
        )}
      </MessageContent>
    </Message>
  )
}

export { MessageRenderer }
export default MessageRenderer
