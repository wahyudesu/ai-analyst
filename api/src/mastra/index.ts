import { chatRoute } from "@mastra/ai-sdk"
import { Mastra } from "@mastra/core/mastra"
import { registerApiRoute } from "@mastra/core/server"
import { LibSQLStore } from "@mastra/libsql"
import { PinoLogger } from "@mastra/loggers"
import {
  CloudExporter,
  DefaultExporter,
  Observability,
  SensitiveDataFilter,
} from "@mastra/observability"
import { sqlagent } from "./agents/postgres"
import { supabaseAgent } from "./agents/supabase"
import { chartAgent } from "./agents/testingagent"
import { chatMemory, dataAnalystMemory, casualChatMemory } from "./memory"
import * as threads from "./routes/threads"

// Export memories for use in API routes
export { chatMemory, dataAnalystMemory, casualChatMemory }

const agents = {
  sqlagent,
  chartAgent,
  ...(supabaseAgent && { supabaseAgent }),
}

export const mastra = new Mastra({
  workflows: {},
  agents,
  scorers: {},
  storage: new LibSQLStore({
    id: "mastra-storage",
    // Store in api directory for easier access
    url: "file:../mastra.db",
  }),
  logger: new PinoLogger({
    name: "Mastra",
    level: "info",
  }),
  observability: new Observability({
    configs: {
      default: {
        serviceName: "mastra",
        exporters: [
          new DefaultExporter(), // Persists traces to storage for Mastra Studio
          new CloudExporter(), // Sends traces to Mastra Cloud (if MASTRA_CLOUD_ACCESS_TOKEN is set)
        ],
        spanOutputProcessors: [
          new SensitiveDataFilter(), // Redacts sensitive data like passwords, tokens, keys
        ],
      },
    },
  }),
  server: {
    apiRoutes: [
      // Chat route for AI SDK UI compatibility
      // Use /chat/data-analyst for PostgreSQL agent
      // Use /chat/supabase-agent for Supabase agent
      chatRoute({
        path: "/chat/:agentId",
      }),
      // Thread/Session management routes
      // Using Mastra's built-in memory routes
      // Threads are managed via Mastra Memory API automatically
      // The chat endpoint accepts memory options: { thread: string, resource?: string }

      // Custom API route to fetch message history for a thread
      registerApiRoute("/messages", {
        method: "GET",
        handler: async (c) => {
          const threadId = c.req.query("threadId")
          const agentId = c.req.query("agentId")
          const page = parseInt(c.req.query("page") || "0")
          const perPage = parseInt(c.req.query("perPage") || "100")

          if (!threadId) {
            return c.json({ error: "threadId is required" }, 400)
          }

          try {
            const result = await threads.getThreadMessages({
              threadId,
              agentId: agentId || undefined,
              page,
              perPage,
            })

            return c.json(result)
          } catch (error) {
            console.error("Error fetching messages:", error)
            return c.json(
              { error: "Failed to fetch messages", messages: [] },
              500
            )
          }
        },
      }),

      // Custom API route to list threads with message counts
      registerApiRoute("/threads", {
        method: "GET",
        handler: async (c) => {
          const agentId = c.req.query("agentId")
          const resourceId = c.req.query("resourceId")
          const page = parseInt(c.req.query("page") || "0")
          const perPage = parseInt(c.req.query("perPage") || "50")

          if (!agentId) {
            return c.json({ error: "agentId is required" }, 400)
          }

          try {
            const result = await threads.listThreadsWithMessageCount({
              agentId,
              resourceId: resourceId || undefined,
              page,
              perPage,
            })

            return c.json({ threads: result })
          } catch (error) {
            console.error("Error listing threads:", error)
            return c.json({ error: "Failed to list threads", threads: [] }, 500)
          }
        },
      }),
    ],
  },
})

// Export thread helpers for custom API routes if needed
export { threads }
