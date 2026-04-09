import { chatRoute } from "@mastra/ai-sdk"
import { Mastra } from "@mastra/core/mastra"
import { registerApiRoute } from "@mastra/core/server"
import { CloudflareDeployer } from "@mastra/deployer-cloudflare"
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
import { casualChatMemory, chatMemory, dataAnalystMemory } from "./memory"
import { checkAuthRoute, loginRoute } from "./routes/auth"
import { modelCheckRoute, modelsRoute } from "./routes/models"
import { sqlRoute } from "./routes/sql"
import * as threads from "./routes/threads"
// MCP Routes will be added lazily to avoid circular dependency

/**
 * LibSQL storage for Mastra
 * Environment variables (optional):
 * - DATABASE_URL: LibSQL connection string (default: file:./mastra.db for local)
 * - OBSERVABILITY_DB_URL: Separate DB for observability (optional, defaults to same as DATABASE_URL)
 */
const storage = new LibSQLStore({
  id: "mastra-storage",
  url: process.env.MEMORY_URL || "file:./mastra.db",
})

// Export memories for use in API routes
export { chatMemory, dataAnalystMemory, casualChatMemory }

// Agent keys must match the agent IDs used in frontend
// The key here is what's used in the URL: /chat/:agentId
const agents = {
  "data-analyst": sqlagent,
  ...(chartAgent && { chartagent: chartAgent }),
  ...(supabaseAgent && { supabase: supabaseAgent }),
}

export const mastra = new Mastra({
  workflows: {},
  agents,
  scorers: {},
  storage,
  logger: new PinoLogger({
    name: "Mastra",
    level: "info",
  }),
  observability: new Observability({
    configs: {
      default: {
        serviceName: "ai-analyst",
        exporters: [
          new DefaultExporter(), // Local: simpan traces ke LibSQLite
          new CloudExporter(), // Production: kirim ke Mastra Cloud (butuh MASTRA_CLOUD_ACCESS_TOKEN)
        ],
        spanOutputProcessors: [
          new SensitiveDataFilter(), // Redacts sensitive data like passwords, tokens, keys
        ],
      },
    },
  }),
  server: {
    apiRoutes: [
      // Chat route - using Mastra's built-in AI SDK streaming
      // Supports dynamic agent routing via :agentId parameter
      chatRoute({
        path: "/chat/:agentId",
      }),
    ],
  },
})

// Export thread helpers for custom API routes if needed
export { threads }
