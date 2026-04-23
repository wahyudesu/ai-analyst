import { Agent } from "@mastra/core/agent"
import { MCPClient } from "@mastra/mcp"
import { DEFAULT_MODEL_ID } from "../config/models.js"
import { dataAnalystMemory } from "../memory"
import { DATA_ANALYST_INSTRUCTIONS } from "./prompt/prompt-supabase"
import { Composio } from "@composio/core"

// Get Composio configuration from environment variables
const configId = process.env.COMPOSIO_MCP_CONFIG_ID
const userId = process.env.COMPOSIO_USER_ID

let mcpClient: MCPClient | null = null
let supabaseAgent: Agent | null = null

if (configId && userId) {
  const composio = new Composio()

  // Generate MCP instance for user using the correct function signature
  // generate(userId: string, mcpConfigId: string, options?: { manuallyManageConnections?: boolean })
  const instance = await composio.mcp.generate(userId, configId)

  // Create MCP client with Composio server URL
  mcpClient = new MCPClient({
    id: "composio-mcp-client",
    servers: {
      composio: { url: new URL(instance.url) },
    },
  })

  // Create a data analyst agent for Supabase/PostgreSQL database with memory
  supabaseAgent = new Agent({
    id: "supabase-agent",
    name: "Supabase Agent",
    description:
      "AI Data analyst specialized in querying, analyzing, and understanding data stored in Supabase/PostgreSQL databases",
    instructions: DATA_ANALYST_INSTRUCTIONS,
    model: DEFAULT_MODEL_ID,
    tools: await mcpClient.listTools(),
    memory: dataAnalystMemory,
  })
}

export { mcpClient, supabaseAgent }
