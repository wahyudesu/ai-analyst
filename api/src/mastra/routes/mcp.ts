/**
 * MCP (Model Context Protocol) Routes
 *
 * Exposes Mastra agents and tools via MCP protocol for external clients.
 * Supports SSE (Server-Sent Events) transport for real-time communication.
 */

import { registerApiRoute } from "@mastra/core/server"
import type { MCPServer } from "@mastra/mcp"

/**
 * MCP Routes Configuration
 *
 * Returns an array of API routes for MCP server communication.
 * These routes handle:
 * - SSE connection establishment
 * - Message handling from MCP clients
 * - Server info and tool discovery
 */
export function mcpRoutes(mcpServer: MCPServer) {
  return [
    /**
     * MCP SSE Connection Route
     * Establishes Server-Sent Events connection for MCP communication
     *
     * GET /mcp/sse
     */
    registerApiRoute("/mcp/sse", {
      method: "GET",
      handler: async (c) => {
        const url = new URL(c.req.url)

        return mcpServer.startHonoSSE({
          url,
          ssePath: "/mcp/sse",
          messagePath: "/mcp/message",
          context: c,
        })
      },
    }),

    /**
     * MCP Message Route
     * Handles incoming messages from MCP clients
     *
     * POST /mcp/message
     */
    registerApiRoute("/mcp/message", {
      method: "POST",
      handler: async (c) => {
        const url = new URL(c.req.url)

        return mcpServer.startHonoSSE({
          url,
          ssePath: "/mcp/sse",
          messagePath: "/mcp/message",
          context: c,
        })
      },
    }),

    /**
     * MCP Server Info Route
     * Returns basic server information for discovery
     *
     * GET /mcp/info
     */
    registerApiRoute("/mcp/info", {
      method: "GET",
      handler: async (c) => {
        const info = mcpServer.getServerInfo()
        return c.json(info)
      },
    }),

    /**
     * MCP Server Detail Route
     * Returns detailed server information including tools
     *
     * GET /mcp/detail
     */
    registerApiRoute("/mcp/detail", {
      method: "GET",
      handler: async (c) => {
        const detail = mcpServer.getServerDetail()
        return c.json(detail)
      },
    }),

    /**
     * MCP Tools List Route
     * Returns all available tools with their schemas
     *
     * GET /mcp/tools
     */
    registerApiRoute("/mcp/tools", {
      method: "GET",
      handler: async (c) => {
        const tools = mcpServer.getToolListInfo()
        return c.json(tools)
      },
    }),

    /**
     * MCP Tool Info Route
     * Returns information about a specific tool
     *
     * GET /mcp/tools/:toolId
     */
    registerApiRoute("/mcp/tools/:toolId", {
      method: "GET",
      handler: async (c) => {
        const toolId = c.req.param("toolId")
        const toolInfo = mcpServer.getToolInfo(toolId)

        if (!toolInfo) {
          return c.json({ error: "Tool not found" }, 404)
        }

        return c.json(toolInfo)
      },
    }),

    /**
     * MCP Tool Execution Route
     * Direct tool execution without MCP protocol
     * Useful for testing and simple integrations
     *
     * POST /mcp/tools/:toolId/execute
     */
    registerApiRoute("/mcp/tools/:toolId/execute", {
      method: "POST",
      handler: async (c) => {
        const toolId = c.req.param("toolId")
        const args = await c.req.json()

        try {
          const result = await mcpServer.executeTool(toolId, args)
          return c.json({ result })
        } catch (error) {
          console.error("Tool execution error:", error)
          return c.json(
            {
              error: "Tool execution failed",
              message: error instanceof Error ? error.message : "Unknown error",
            },
            500
          )
        }
      },
    }),
  ]
}
