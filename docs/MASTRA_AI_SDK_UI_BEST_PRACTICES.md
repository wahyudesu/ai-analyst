# Mastra + AI SDK UI: Best Practices untuk Generative UI

Panduan ini berisi rekomendasi best practice untuk mengimplementasikan Mastra Generative UI menggunakan AI SDK UI dalam project ai-analyst.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Backend Best Practices](#backend-best-practices)
3. [Frontend Best Practices](#frontend-best-practices)
4. [Generative UI Patterns](#generative-ui-patterns)
5. [Type Safety](#type-safety)
6. [Error Handling](#error-handling)
7. [Performance Optimization](#performance-optimization)

---

## Architecture Overview

### Current Setup

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Next.js 16    │────▶│  Mastra Server  │────▶│   PostgreSQL    │
│  (web/src)      │     │  (api/src)      │     │   Database      │
│                 │     │  :4111          │     │                 │
│  - useChat()    │     │  - chatRoute()  │     │                 │
│  - React 19     │     │  - Agents       │     │                 │
│  - AI SDK UI    │     │  - Tools        │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

### Key Components

| Component | Purpose | Location |
|-----------|---------|----------|
| `chatRoute()` | AI SDK-compatible chat endpoint | `api/src/mastra/index.ts` |
| `useChat()` | React hook for chat | `web/src/components/Chat.tsx` |
| `DefaultChatTransport` | Transport layer for AI SDK | `web/src/components/Chat.tsx` |
| `MessageRenderer` | Custom message rendering | `web/src/components/MessageRenderer.tsx` |

---

## Backend Best Practices

### 1. Tool Output Schema Definition

**✅ DO**: Selalu definisikan `outputSchema` untuk tools yang akan digunakan di frontend.

```typescript
// api/src/mastra/tools/charts/generate-chart.ts
import { createTool } from "@mastra/core/tools"
import { z } from "zod"

export const generateChartTool = createTool({
  id: "generate-chart",
  description: "Generate chart from data",
  inputSchema: z.object({
    data: z.any(),
    chartType: z.enum(["bar", "line", "area", "pie"]),
    title: z.string(),
  }),
  // ❌ BAD: Tidak ada outputSchema - frontend tidak tahu shape data
  // execute: async ({ data }) => ({ ... })

  // ✅ GOOD: Dengan outputSchema - frontend bisa type-check
  outputSchema: z.object({
    chartType: z.string(),
    title: z.string(),
    data: z.array(z.object({
      name: z.string(),
      value: z.number(),
    })),
    config: z.object({
      xAxis: z.string().optional(),
      yAxis: z.string().optional(),
    }).optional(),
  }),
  execute: async ({ data, chartType, title }) => {
    // Tool implementation
    return {
      chartType,
      title,
      data: processedData,
      config: { xAxis: "name", yAxis: "value" },
    }
  },
})
```

### 2. Streaming Tool Outputs

**✅ DO**: Gunakan `writer.custom()` untuk progress indicators pada long-running operations.

```typescript
// api/src/mastra/tools/postgres/execute-sql.ts
import { createTool } from "@mastra/core/tools"
import { z } from "zod"

export const executeSqlTool = createTool({
  id: "execute-sql",
  description: "Execute SQL query",
  inputSchema: z.object({
    query: z.string(),
  }),
  outputSchema: z.object({
    columns: z.array(z.string()),
    rows: z.array(z.any()),
    rowCount: z.number(),
  }),
  execute: async ({ query }, context) => {
    // Emit progress event
    await context?.writer?.custom({
      type: "data-query-progress",
      data: {
        status: "executing",
        message: "Running query..."
      },
    })

    const result = await db.query(query)

    // Emit completion event
    await context?.writer?.custom({
      type: "data-query-progress",
      data: {
        status: "completed",
        rowCount: result.rowCount
      },
    })

    return result
  },
})
```

### 3. Dynamic Agent Routing

**✅ DO**: Gunakan dynamic routing pada `chatRoute()` untuk multiple agents.

```typescript
// api/src/mastra/index.ts
import { chatRoute } from "@mastra/ai-sdk"

export const mastra = new Mastra({
  agents: { sqlagent, supabaseAgent, chartAgent },
  server: {
    apiRoutes: [
      // ✅ GOOD: Dynamic routing - satu endpoint untuk semua agents
      chatRoute({
        path: "/chat/:agentId",
        // Tidak perlu specify agent - diambil dari URL parameter
      }),

      // ❌ AVOID: Static routing - butuh endpoint per agent
      // chatRoute({ path: "/chat/sql", agent: "sqlagent" }),
      // chatRoute({ path: "/chat/supabase", agent: "supabaseAgent" }),
    ],
  },
})
```

### 4. Memory Management

**✅ DO**: Konfigurasi memory dengan benar untuk thread persistence.

```typescript
// api/src/mastra/memory.ts
import { threadMemory } from "@mastra/memory"

export const dataAnalystMemory = threadMemory({
  storage: new LibSQLStore({
    url: "file:./memory.db",
  }),
  options: {
    threadId: {
      // ✅ GOOD: Gunakan thread ID yang konsisten
      generate: () => crypto.randomUUID(),
    },
    lastMessages: {
      // ✅ GOOD: Batasi jumlah messages untuk performance
      count: 100,
    },
  },
})
```

---

## Frontend Best Practices

### 1. useChat Configuration

**✅ DO**: Gunakan `prepareSendMessagesRequest` untuk custom request body.

```typescript
// web/src/components/Chat.tsx
import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport } from "ai"

export function Chat({ agentId }: ChatProps) {
  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({
      api: `/api/chat?agentId=${agentId}`,

      // ✅ GOOD: Custom request preparation untuk memory
      prepareSendMessagesRequest: ({ messages }) => ({
        body: {
          messages,
          memory: {
            thread: { id: threadId },
            resource: resourceId,
          },
        },
      }),
    }),

    // ✅ GOOD: Event handlers untuk lifecycle management
    onFinish: (message) => {
      console.log("Message completed:", message.id)
      // Trigger refresh session list, etc.
    },
    onError: (error) => {
      console.error("Chat error:", error)
      // Show error toast
    },
  })

  // ...
}
```

### 2. Type-Safe Message Rendering

**✅ DO**: Gunakan types dari `@mastra/ai-sdk` untuk type safety.

```typescript
// web/src/components/MessageRenderer.tsx
import type { ToolUIPart } from "@ai-sdk/react"

interface MessageRendererProps {
  message: {
    role: string
    parts?: Array<ToolUIPart | { type: "text"; text: string }>
  }
}

export function MessageRenderer({ message }: MessageRendererProps) {
  return (
    <div>
      {message.parts?.map((part, index) => {
        // ✅ GOOD: Type-safe part checking
        if (part.type === "text") {
          return <Markdown key={index}>{part.text}</Markdown>
        }

        // ✅ GOOD: Type-safe tool part handling
        if (part.type.startsWith("tool-")) {
          switch (part.state) {
            case "input-available":
              return <ToolLoading key={index} toolName={part.toolName} />
            case "output-available":
              return <ToolResult key={index} data={part.output} />
            case "output-error":
              return <ToolError key={index} error={part.error} />
          }
        }

        return null
      })}
    </div>
  )
}
```

### 3. Custom Component Rendering

**✅ DO**: Extract custom components untuk reusable generative UI.

```typescript
// web/src/components/generative/ChartCard.tsx
import type { ChartConfig } from "./charts/types"

interface ChartCardProps extends ChartConfig {}

export function ChartCard({
  chartType,
  title,
  data,
  config
}: ChartCardProps) {
  return (
    <div className="rounded-lg border bg-white dark:bg-zinc-900 p-4">
      <h3 className="text-lg font-semibold mb-4">{title}</h3>
      <ChartRenderer config={{ chartType, title, data, config }} />
    </div>
  )
}

// Usage in MessageRenderer:
// if (part.output?.chartType) {
//   return <ChartCard key={index} {...part.output} />
// }
```

### 4. Part Type Handling Pattern

**✅ DO**: Gunakan pattern matching untuk handle berbagai part types.

```typescript
// web/src/components/MessageRenderer.tsx

const renderPart = (part: MessagePart) => {
  switch (part.type) {
    case "text":
      return <TextContent>{part.text}</TextContent>

    // Tool outputs
    case "tool-generateChart":
      return renderChart(part)

    case "tool-executeSql":
      return renderSqlResult(part)

    // Workflow data
    case "data-workflow":
      return <WorkflowProgress data={part.data} />

    // Network data
    case "data-network":
      return <NetworkSteps data={part.data} />

    // Custom events
    case "data-query-progress":
      return <QueryProgress status={part.data.status} />

    case "data-tool-progress":
      return <ToolProgress progress={part.data} />

    default:
      // Handle unknown parts gracefully
      return <UnknownPart type={(part as any).type} />
  }
}
```

---

## Generative UI Patterns

### Data Part Types

| Data Part Type | Source | Description |
|----------------|--------|-------------|
| `tool-{toolKey}` | AI SDK built-in | Tool invocation with states: `input-available`, `output-available`, `output-error` |
| `data-workflow` | `workflowRoute()` | Workflow execution with step inputs, outputs, and status |
| `data-network` | `networkRoute()` | Agent network execution with ordered steps and outputs |
| `data-tool-agent` | Nested agent in tool | Agent output streamed from within a tool's `execute()` |
| `data-tool-workflow` | Nested workflow in tool | Workflow output streamed from within a tool's `execute()` |
| `data-tool-network` | Nested network in tool | Network output streamed from within a tool's `execute()` |
| `data-{custom}` | `writer.custom()` | Custom events for progress indicators, status updates, etc. |

### Pattern 1: Progressive Loading

Tampilkan UI berdasarkan state lifecycle dari tool execution.

```typescript
// web/src/components/generative/ProgressiveTool.tsx

interface ProgressiveToolProps {
  toolName: string
  state: "input-available" | "output-available" | "output-error"
  input?: any
  output?: any
  error?: any
}

export function ProgressiveTool({
  toolName,
  state,
  input,
  output,
  error
}: ProgressiveToolProps) {
  return (
    <div className="tool-card">
      <ToolHeader name={toolName} state={state} />

      {state === "input-available" && (
        <ToolInput input={input} />
      )}

      {state === "output-available" && (
        <ToolOutput output={output} />
      )}

      {state === "output-error" && (
        <ToolError error={error} />
      )}
    </div>
  )
}
```

### Pattern 2: Custom Events Streaming

Emit custom events untuk real-time progress updates.

```typescript
// Backend - Tool dengan custom events
export const longRunningTool = createTool({
  id: "long-running",
  execute: async (input, context) => {
    const steps = ["Validating", "Processing", "Analyzing", "Completing"]

    for (const step of steps) {
      await context?.writer?.custom({
        type: "data-progress-step",
        data: { step, status: "in-progress" },
      })

      await performStep(step)

      await context?.writer?.custom({
        type: "data-progress-step",
        data: { step, status: "completed" },
      })
    }

    return { success: true }
  },
})

// Frontend - Progress component
function ProgressIndicator({ messages }: { messages: Message[] }) {
  const latestProgress = useMemo(() => {
    for (const msg of [...messages].reverse()) {
      const progressPart = msg.parts?.find(
        p => p.type === "data-progress-step"
      )
      if (progressPart) return progressPart.data
    }
    return null
  }, [messages])

  if (!latestProgress) return null

  return (
    <div className="progress-indicator">
      <StepIndicator step={latestProgress.step} />
    </div>
  )
}
```

### Pattern 3: Nested Agent Streams

Stream nested agent output untuk multi-agent scenarios.

```typescript
// Backend - Tool yang memanggil agent lain
export const researchTool = createTool({
  id: "research",
  execute: async (input, context) => {
    const researchAgent = context?.mastra?.getAgent("researchAgent")
    const stream = await researchAgent?.stream(input.topic)

    // Pipe agent stream ke tool writer
    await stream?.fullStream.pipeTo(context!.writer)

    return { summary: await stream?.text }
  },
})

// Frontend - Handle nested agent output
if (part.type === "data-tool-agent") {
  return (
    <div className="nested-agent-output">
      <AgentBadge id={part.id} />
      <Markdown>{part.data.text}</Markdown>
    </div>
  )
}
```

---

## Type Safety

### Export Tool Schemas

**✅ DO**: Export tool schemas untuk digunakan di frontend.

```typescript
// api/src/mastra/tools/charts/types.ts
import { z } from "zod"

export const chartConfigSchema = z.object({
  chartType: z.enum(["bar", "line", "area", "pie"]),
  title: z.string(),
  data: z.array(z.object({
    name: z.string(),
    value: z.number(),
  })),
})

export type ChartConfig = z.infer<typeof chartConfigSchema>

// Export untuk frontend
export { chartConfigSchema as generateChartOutputSchema }
```

```typescript
// web/src/types/charts.ts
// Import schema dari backend package atau copy untuk type safety
import { z } from "zod"

export const chartConfigSchema = z.object({
  chartType: z.enum(["bar", "line", "area", "pie"]),
  title: z.string(),
  data: z.array(z.object({
    name: z.string(),
    value: z.number(),
  })),
})

export type ChartConfig = z.infer<typeof chartConfigSchema>

// Runtime validation
export function validateChartOutput(output: unknown): ChartConfig | null {
  const result = chartConfigSchema.safeParse(output)
  return result.success ? result.data : null
}
```

---

## Error Handling

### 1. Tool Error Handling

```typescript
// Backend - Tool dengan error handling
export const executeSqlTool = createTool({
  id: "execute-sql",
  execute: async ({ query }) => {
    try {
      const result = await db.query(query)
      return result
    } catch (error) {
      // ✅ GOOD: Return structured error
      return {
        error: true,
        message: error instanceof Error ? error.message : "Unknown error",
        code: "QUERY_FAILED",
      }
    }
  },
})

// Frontend - Error rendering
function ToolError({ error }: { error: unknown }) {
  const errorMessage = error instanceof Error
    ? error.message
    : "An error occurred"

  return (
    <div className="error-card">
      <AlertCircle className="text-red-500" />
      <p>{errorMessage}</p>
    </div>
  )
}
```

### 2. Network Error Handling

```typescript
// web/src/components/Chat.tsx
const { messages, sendMessage, error, status } = useChat({
  transport: new DefaultChatTransport({
    api: `/api/chat?agentId=${agentId}`,
  }),
  onError: (error) => {
    // ✅ GOOD: Centralized error handling
    toast.error("Failed to send message", {
      description: error.message,
    })
  },
})

// Render error state
{error && (
  <ErrorMessage
    error={error}
    onRetry={() => sendMessage(lastMessage)}
  />
)}
```

---

## Performance Optimization

### 1. Message Memoization

```typescript
// web/src/components/MessageRenderer.tsx
import { memo } from "react"

// ✅ GOOD: Memoize message renderer untuk prevent re-renders
export const MessageRenderer = memo(function MessageRenderer({
  message
}: MessageRendererProps) {
  // Render logic...
}, (prev, next) => {
  // Custom comparison untuk deep comparison
  return prev.message.id === next.message.id &&
         prev.message.parts?.length === next.message.parts?.length
})
```

### 2. Lazy Loading Components

```typescript
// web/src/components/generative/index.ts
import { lazy } from "react"

// ✅ GOOD: Lazy load chart components
export const ChartCard = lazy(() => import("./ChartCard"))
export const TableCard = lazy(() => import("./TableCard"))
export const WorkflowProgress = lazy(() => import("./WorkflowProgress"))

// Usage dengan Suspense
import { Suspense } from "react"

<Suspense fallback={<ChartSkeleton />}>
  <ChartCard {...data} />
</Suspense>
```

### 3. Debounced Input

```typescript
// web/src/components/Chat.tsx
import { useDebouncedCallback } from "use-debounce"

export function Chat() {
  const [input, setInput] = useState("")

  // ✅ GOOD: Debounce typing indicators
  const debouncedTypingIndicator = useDebouncedCallback(
    () => {
      // Show typing indicator
    },
    500
  )

  const handleChange = (value: string) => {
    setInput(value)
    debouncedTypingIndicator()
  }

  // ...
}
```

---

## Resources

### Official Documentation
- [Mastra AI SDK UI Guide](https://mastra.ai/guides/build-your-ui/ai-sdk-ui)
- [AI SDK Documentation](https://ai-sdk.dev/docs/ai-sdk-ui/chatbot)
- [AI SDK 6 Announcement](https://vercel.com/blog/ai-sdk-6)
- [AI Elements](https://vercel.com/changelog/introducing-ai-elements)

### Mastra UI Dojo Examples
- [Generative UIs](https://ui-dojo.mastra.ai/) - Custom components for tool outputs
- [Workflows](https://ui-dojo.mastra.ai/) - Workflow step visualization
- [Agent Networks](https://ui-dojo.mastra.ai/) - Network execution display

### Community
- [Mastra Discord](https://discord.gg/mastra)
- [Mastra GitHub](https://github.com/mastra-ai/mastra)
