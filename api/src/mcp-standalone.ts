/**
 * MCP Server Entry Point
 *
 * This is a standalone MCP server that can be run independently
 * to expose Mastra agents via Model Context Protocol.
 *
 * Usage:
 *   node dist/mcp-server.js
 *
 * Or import MCP server from elsewhere:
 *   import { mcpServer } from './mcp-server'
 */

import { mcpServer } from './mcp-server.js'

// Start MCP server with stdio transport
// This allows it to be used by MCP clients like Claude Desktop, Cursor, etc.
async function main() {
  console.log('Starting AI Analyst MCP Server...')
  console.log('Server info:', mcpServer.getServerInfo())

  try {
    await mcpServer.startStdio()
  } catch (error) {
    console.error('Failed to start MCP server:', error)
    process.exit(1)
  }
}

// Only run if this is the main module
if (import.meta.url === `file://${process.argv[1]}`) {
  main()
}

export { mcpServer }
