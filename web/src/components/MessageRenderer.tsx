"use client"

import { code } from "@streamdown/code"
import { math } from "@streamdown/math"
import { mermaid } from "@streamdown/mermaid"
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
import { Streamdown } from "streamdown"

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  ChartRenderer,
  CollapsibleMultipleCharts,
  MultipleCharts,
} from "./charts"
import type { ChartConfig, MultipleChartsConfig } from "./charts/types"

// Constants
const LONG_OUTPUT_THRESHOLD = 200
const TOOL_PART_TYPES = ["tool-call", "tool-result", "tool-error"]

// Types
interface MessagePart {
  type: string
  text?: string
  state?: "input-available" | "output-available" | "output-error"
  toolName?: string
  toolCallId?: string
  args?: unknown | string
  input?: unknown
  output?: unknown
  result?: unknown
  isError?: boolean
  error?: unknown
  errorText?: string
}

interface Message {
  id?: string
  role: "user" | "assistant" | "system"
  content?: string
  parts?: MessagePart[]
}

interface MessageRendererProps {
  message: Message
  agentInfo?: {
    id: string
    name: string
    description?: string
  } | null
  onRename?: () => void
  onPin?: () => void
  onDelete?: () => void
  sessionId?: string
  compact?: boolean
  skipAnimation?: boolean
}

// Helper functions outside component for stability
function isToolPart(part: MessagePart): boolean {
  return part.type?.startsWith("tool-") || TOOL_PART_TYPES.includes(part.type)
}

function isLongOutput(output: unknown): boolean {
  if (!output) return false
  const str = typeof output === "string" ? output : JSON.stringify(output)
  return str.length > LONG_OUTPUT_THRESHOLD
}

// Check if part should be collapsed (all tool results collapsed by default)
function shouldPartBeCollapsed(part: MessagePart): boolean {
  // All input states are collapsed
  if (part.state === "input-available") return true
  // All output states are collapsed by default
  if (part.state === "output-available") return true
  // Legacy state - always collapsed
  if (!part.state) return true
  return false
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

function formatArgs(args: unknown): string {
  if (!args) return ""
  if (typeof args === "string") {
    try {
      const parsed = JSON.parse(args) as unknown
      return JSON.stringify(parsed, null, 2)
    } catch {
      return args
    }
  }
  return JSON.stringify(args, null, 2)
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

function extractTextContent(message: Message): string {
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

// ============================================================================
// Component
// ============================================================================

/**
 * Renders different types of messages from the AI agent
 * Supports text, tool calls, and chart visualizations
 * Pattern based on Vercel AI SDK Generative UI
 */
function MessageRenderer({
  message,
  agentInfo,
  onRename,
  onPin,
  onDelete,
  sessionId,
  compact = false,
  skipAnimation,
}: MessageRendererProps) {
  const isUser = message.role === "user"
  const [copied, setCopied] = useState(false)
  const [liked, setLiked] = useState(false)
  const [disliked, setDisliked] = useState(false)

  // Memoized derived values
  const chartConfig = useMemo(
    () => extractChartConfig(message.parts),
    [message.parts]
  )
  const multipleChartsConfig = useMemo(
    () => extractMultipleChartsConfig(message.parts),
    [message.parts]
  )
  const textContent = useMemo(() => extractTextContent(message), [message])
  const toolParts = useMemo(() => {
    return message.parts?.filter(isToolPart) ?? []
  }, [message.parts])

  // Initialize collapsed state - tools that should be collapsed start as collapsed
  const [collapsedTools, setCollapsedTools] = useState<Set<number>>(() => {
    const initialCollapsed = new Set<number>()
    toolParts.forEach((part, index) => {
      if (shouldPartBeCollapsed(part)) {
        initialCollapsed.add(index)
      }
    })
    return initialCollapsed
  })

  const toggleToolCollapse = (index: number) => {
    setCollapsedTools(prev => {
      const next = new Set(prev)
      if (next.has(index)) {
        next.delete(index)
      } else {
        next.add(index)
      }
      return next
    })
  }

  const handleCopy = async () => {
    // Extract full message content including tool results
    let fullContent = textContent

    // Add tool outputs to the content
    if (toolParts.length > 0) {
      toolParts.forEach(part => {
        const toolName = getToolName(part)
        if (part.output) {
          fullContent += `\n\n**${toolName} Result:**\n${JSON.stringify(part.output, null, 2)}`
        }
      })
    }

    await navigator.clipboard.writeText(fullContent)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleLike = () => {
    if (disliked) {
      setDisliked(false)
    }
    setLiked(!liked)
    // TODO: Send to backend when ready
    console.log("Message liked:", message.id)
  }

  const handleDislike = () => {
    if (liked) {
      setLiked(false)
    }
    setDisliked(!disliked)
    // TODO: Send to backend when ready
    console.log("Message disliked:", message.id)
  }

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`
          ${compact ? "max-w-full" : "max-w-5xl"} min-h-[5rem] rounded-2xl px-4 py-3 relative group
          flex flex-col gap-3
          ${
            isUser
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-foreground"
          }
          ${compact ? "text-sm" : ""}
        `}
      >
        {/* Action buttons - shown on hover for AI messages */}
        {!isUser && (
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
            {/* Copy button */}
            <button
              onClick={handleCopy}
              className="p-1.5 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg transition-colors"
              title={copied ? "Copied!" : "Copy"}
            >
              {copied ? (
                <Check className="w-4 h-4 text-green-600 dark:text-green-400" />
              ) : (
                <Copy className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
              )}
            </button>

            {/* Like button */}
            <button
              onClick={handleLike}
              className={`p-1.5 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg transition-colors ${
                liked
                  ? "text-blue-600 dark:text-blue-400"
                  : "text-zinc-500 dark:text-zinc-400"
              }`}
              title="Like"
            >
              <ThumbsUp className="w-4 h-4" />
            </button>

            {/* Dislike button */}
            <button
              onClick={handleDislike}
              className={`p-1.5 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg transition-colors ${
                disliked
                  ? "text-red-600 dark:text-red-400"
                  : "text-zinc-500 dark:text-zinc-400"
              }`}
              title="Dislike"
            >
              <ThumbsDown className="w-4 h-4" />
            </button>

            {/* More actions menu - only show if callbacks are provided */}
            {(onRename || onPin || onDelete) && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="p-1.5 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg transition-colors text-zinc-500 dark:text-zinc-400"
                    title="More actions"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>
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
                      className="cursor-pointer text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400"
                    >
                      Delete chat
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        )}

        {/* Agent Badge - shown only for AI messages */}
        {!isUser && agentInfo && (
          <div className="flex items-center gap-2 pb-2 border-b border-zinc-200 dark:border-zinc-700 pr-8">
            <Database className="w-3 h-3 text-zinc-500 dark:text-zinc-400" />
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
              by {agentInfo.name}
            </span>
          </div>
        )}

        {/* Text content */}
        {textContent && (
          <div className="prose prose-sm dark:prose-invert max-w-none markdown-content">
            <Streamdown plugins={{ code, math, mermaid }}>
              {textContent}
            </Streamdown>
          </div>
        )}

        {/* Tool parts */}
        {toolParts.length > 0 && !isUser && (
          <div className="space-y-2">
            {toolParts.map((part, index) => (
              <ToolPart
                key={index}
                part={part}
                isCollapsed={collapsedTools.has(index)}
                canCollapse={shouldPartBeCollapsed(part)}
                onToggleCollapse={() => toggleToolCollapse(index)}
              />
            ))}
          </div>
        )}

        {/* Chart rendering */}
        {multipleChartsConfig && !isUser && (
          <div className="min-h-[5rem]">
            <CollapsibleMultipleCharts
              config={multipleChartsConfig}
              defaultOpen={false}
              skipAnimation={skipAnimation}
            />
          </div>
        )}
        {chartConfig && !isUser && (
          <div className="bg-white dark:bg-zinc-900 rounded-lg p-4 min-h-[20rem]">
            <ChartRenderer config={chartConfig} skipAnimation={skipAnimation} />
          </div>
        )}
      </div>
    </div>
  )
}

// ============================================================================
// Tool Part Sub-component
// ============================================================================

interface ToolPartProps {
  part: MessagePart
  isCollapsed: boolean
  canCollapse: boolean
  onToggleCollapse: () => void
}

function ToolPart({
  part,
  isCollapsed,
  canCollapse,
  onToggleCollapse,
}: ToolPartProps) {
  const toolName = getToolName(part)

  // Skip rendering if chart output or multiple charts output (rendered separately)
  if (hasChartOutput(part.output) || hasMultipleChartsOutput(part.output)) {
    return null
  }

  // Render based on state
  switch (part.state) {
    case "input-available":
      return (
        <ToolInputState
          part={part}
          toolName={toolName}
          isCollapsed={isCollapsed}
          onToggleCollapse={canCollapse ? onToggleCollapse : undefined}
        />
      )

    case "output-available":
      return (
        <ToolOutputState
          part={part}
          toolName={toolName}
          isCollapsed={isCollapsed}
          canCollapse={canCollapse}
          onToggleCollapse={onToggleCollapse}
        />
      )

    case "output-error":
      return <ToolErrorState part={part} toolName={toolName} />

    default:
      return (
        <ToolLegacyState
          part={part}
          toolName={toolName}
          isCollapsed={isCollapsed}
          canCollapse={canCollapse}
          onToggleCollapse={onToggleCollapse}
        />
      )
  }
}

// ============================================================================
// Tool State Components
// ============================================================================

function ToolInputState({
  part,
  toolName,
  isCollapsed = true,
  onToggleCollapse,
}: {
  part: MessagePart
  toolName: string
  isCollapsed?: boolean
  onToggleCollapse?: () => void
}) {
  return (
    <Collapsible open={!isCollapsed} onOpenChange={onToggleCollapse}>
      <div className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 overflow-hidden">
        <CollapsibleTrigger className="flex items-center justify-between w-full px-3 py-2 min-h-[2.5rem]">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
            <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
              Calling {toolName}...
            </span>
          </div>
          <ChevronRight
            className={`w-4 h-4 text-zinc-500 transition-transform ${!isCollapsed ? "rotate-90" : ""}`}
          />
        </CollapsibleTrigger>
        <CollapsibleContent>
          {part.args != null && (
            <pre className="text-xs text-zinc-600 dark:text-zinc-400 mt-2 px-3 pb-2 overflow-x-auto">
              {formatArgs(part.args as Record<string, unknown>)}
            </pre>
          )}
        </CollapsibleContent>
      </div>
    </Collapsible>
  )
}

function ToolOutputState({
  part,
  toolName,
  isCollapsed,
  canCollapse,
  onToggleCollapse,
}: {
  part: MessagePart
  toolName: string
  isCollapsed: boolean
  canCollapse: boolean
  onToggleCollapse: () => void
}) {
  return (
    <Collapsible
      open={!isCollapsed}
      onOpenChange={canCollapse ? onToggleCollapse : undefined}
    >
      <div className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 overflow-hidden">
        <CollapsibleTrigger className="flex items-center justify-between w-full px-3 py-2 min-h-[2.5rem] hover:bg-zinc-100 dark:hover:bg-zinc-700/50 transition-colors">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full" />
            <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
              {toolName} Result
            </span>
          </div>
          {canCollapse && (
            <span className="text-zinc-500 dark:text-zinc-400 pointer-events-none">
              {isCollapsed ? (
                <ChevronRight className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </span>
          )}
        </CollapsibleTrigger>
        <CollapsibleContent>
          {part.output != null && (
            <div className="px-3 pb-2">
              <pre className="text-xs text-zinc-600 dark:text-zinc-400 overflow-x-auto max-h-64 overflow-y-auto">
                {JSON.stringify(part.output, null, 2)}
              </pre>
            </div>
          )}
        </CollapsibleContent>
      </div>
    </Collapsible>
  )
}

function ToolErrorState({
  part,
  toolName,
}: { part: MessagePart; toolName: string }) {
  return (
    <div className="rounded-lg border border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/20 px-3 py-2 min-h-[2.5rem]">
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 bg-red-500 rounded-full" />
        <span className="text-xs font-medium text-red-700 dark:text-red-300">
          {toolName} Error
        </span>
      </div>
      <p className="text-xs text-red-600 dark:text-red-400 mt-1">
        {part.errorText || String(part.error) || "Unknown error"}
      </p>
    </div>
  )
}

function ToolLegacyState({
  part,
  toolName,
  isCollapsed,
  canCollapse,
  onToggleCollapse,
}: {
  part: MessagePart
  toolName: string
  isCollapsed: boolean
  canCollapse: boolean
  onToggleCollapse: () => void
}) {
  const isError = part.isError ?? false
  const hasContent = Boolean(
    (part.output || part.result) && !hasChartOutput(part.output)
  )

  return (
    <Collapsible
      open={!isCollapsed}
      onOpenChange={canCollapse ? onToggleCollapse : undefined}
    >
      <div
        className={`rounded-lg border overflow-hidden ${
          isError
            ? "border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/20"
            : "border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50"
        }`}
      >
        <CollapsibleTrigger className="flex items-center justify-between w-full px-3 py-2 min-h-[2.5rem] hover:bg-zinc-100 dark:hover:bg-zinc-700/50 transition-colors">
          <div className="flex items-center gap-2">
            <div
              className={`w-2 h-2 rounded-full ${isError ? "bg-red-500" : "bg-green-500"}`}
            />
            <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
              {toolName}
            </span>
          </div>
          {hasContent && canCollapse ? (
            <span className="text-zinc-500 dark:text-zinc-400 pointer-events-none">
              {isCollapsed ? (
                <ChevronRight className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </span>
          ) : null}
        </CollapsibleTrigger>
        <CollapsibleContent>
          {hasContent && (
            <div className="px-3 pb-2">
              <pre className="text-xs text-zinc-600 dark:text-zinc-400 overflow-x-auto max-h-64 overflow-y-auto">
                {JSON.stringify(part.output || part.result, null, 2)}
              </pre>
            </div>
          )}
        </CollapsibleContent>
      </div>
    </Collapsible>
  )
}

// ============================================================================
// Memoized Export
// ============================================================================

export const MessageRendererMemo = memo(MessageRenderer, (prev, next) => {
  if (prev.message.id !== next.message.id) return false
  if (prev.agentInfo?.id !== next.agentInfo?.id) return false

  const prevContent = prev.message.content || JSON.stringify(prev.message.parts)
  const nextContent = next.message.content || JSON.stringify(next.message.parts)

  return prevContent === nextContent
})

export { MessageRenderer as default, MessageRenderer }
