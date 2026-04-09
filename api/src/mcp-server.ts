/**
 * Mastra MCP Server Configuration
 *
 * Exposes Mastra agents, tools, and workflows via Model Context Protocol (MCP)
 * This allows MCP clients (like Cursor, Claude Desktop, or custom clients) to connect
 * and use the AI Analyst capabilities.
 *
 * For Next.js integration, the MCP server provides:
 * 1. Tool discovery and execution
 * 2. Resource access (database schema, query results)
 * 3. Prompt templates for common operations
 */

import { MCPServer } from "@mastra/mcp"
import { sqlagent } from "./agents/postgres"
import { chartAgent } from "./agents/testingagent"

/**
 * Create MCP Server instance
 *
 * This server exposes:
 * - Agents: data-analyst (sqlagent), chart-agent (chartAgent)
 * - Tools: All PostgreSQL and chart tools
 * - Resources: Database schemas, query history
 */
export const mcpServer = new MCPServer({
  name: "AI Analyst MCP Server",
  version: "1.0.0",
  description: "MCP server for AI data analysis with PostgreSQL integration",

  // Expose Mastra agents as MCP tools
  agents: {
    // The sqlagent will be available as "ask_sqlagent" tool
    dataAnalyst: sqlagent,
    // The chartAgent will be available as "ask_chartAgent" tool
    chartAgent: chartAgent,
  },

  // Optional: Define additional resources for MCP clients
  resources: {
    // Database schema resource
    "database://schema": {
      uri: "database://schema",
      name: "Database Schema",
      description: "Current database schema overview",
      mimeType: "application/json",
    },
    // Query history resource
    "database://history": {
      uri: "database://history",
      name: "Query History",
      description: "Recent query history and results",
      mimeType: "application/json",
    },
  },

  // Optional: Define prompt templates for common operations
  prompts: {
    "analyze-table": {
      uri: "prompt://analyze-table",
      name: "Analyze Table",
      description: "Analyze a specific table in the database",
      arguments: [
        {
          name: "tableName",
          description: "Name of the table to analyze",
          required: true,
        },
      ],
    },
    "create-chart": {
      uri: "prompt://create-chart",
      name: "Create Chart",
      description: "Create a visualization from query results",
      arguments: [
        {
          name: "query",
          description: "SQL query to execute",
          required: true,
        },
        {
          name: "chartType",
          description: "Type of chart (bar, line, area, pie)",
          required: false,
        },
      ],
    },
  },
})

/**
 * MCP Server routes for Hono integration
 *
 * These routes handle MCP SSE connections:
 * - GET /mcp/sse - Establish SSE connection
 * - POST /mcp/message - Handle MCP messages from clients
 */

/**
 * Get server information for MCP discovery
 */
export function getMCPServerInfo() {
  return mcpServer.getServerInfo()
}

/**
 * Get detailed server information
 */
export function getMCPServerDetail() {
  return mcpServer.getServerDetail()
}

/**
 * Get list of all available tools via MCP
 */
export function getMCPTools() {
  return mcpServer.getToolListInfo()
}

/**
 * Execute a specific tool via MCP
 */
export async function executeMCPTool(toolId: string, args: Record<string, unknown>) {
  return mcpServer.executeTool(toolId, args)
}

export default mcpServer
