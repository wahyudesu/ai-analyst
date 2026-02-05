import { MCPClient } from "@mastra/mcp";
import { Agent } from "@mastra/core/agent";
import { Composio } from "@composio/core";
import { DATA_ANALYST_INSTRUCTIONS } from "./prompt/prompt-supabase";

// Initialize Composio
const composio = new Composio();

const configId = "b4a38de3-407d-40d1-8317-f82f739a3994";
const userId = "pg-test-ef1ee700-5a85-4b0d-af86-196821a6f5d4";

// Generate MCP instance for user using the correct function signature
// generate(userId: string, mcpConfigId: string, options?: { manuallyManageConnections?: boolean })
const instance = await composio.mcp.generate(userId, configId);

// Create MCP client with Composio server URL
export const mcpClient = new MCPClient({
  id: "composio-mcp-client",
  servers: {
    composio: { url: new URL(instance.url) },
  },
});

// Create a data analyst agent for Supabase/PostgreSQL database
export const supabaseAgent = new Agent({
  id: "supabase-agent",
  name: "Supabase Agent",
  description:
    "AI Data analyst specialized in querying, analyzing, and understanding data stored in Supabase/PostgreSQL databases",
  instructions: DATA_ANALYST_INSTRUCTIONS,
  // model: "openai/o4-mini",
  model: "zai-coding-plan/glm-4.5",
  tools: await mcpClient.listTools(),
});
