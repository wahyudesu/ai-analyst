import { createTool } from "@mastra/core/tools"
import { z } from "zod"
import { connectionManager } from "../../../db/connection-manager.js"
import { getDatabaseUrl } from "../../lib/request-context.js"

export const getSchemaTool = createTool({
  id: "get-schema",
  description:
    "Get an overview of all tables in the PostgreSQL database including table names, row counts, and sizes. Use this as the first step to understand what tables are available. Connections are pooled and reused for better performance. The database connection is automatically provided - do not ask the user for it.",
  inputSchema: z.object({
    schema: z
      .string()
      .default("public")
      .describe("Schema name (default: public)"),
  }),
  execute: async ({ schema = "public" }) => {
    // Get connection string from secure request context (not from LLM)
    const connectionString = getDatabaseUrl() || process.env.DATABASE_URL || '';

    if (!connectionString) {
      throw new Error('DATABASE_URL environment variable is not set. Please configure your PostgreSQL connection string.');
    }

    try {
      const pool = await connectionManager.getPool(connectionString)

      const query = `
        SELECT
          t.table_name AS "tableName",
          COALESCE(s.n_live_tup, 0) AS "rowCount",
          pg_size_pretty(pg_total_relation_size(quote_ident(t.table_schema)||'.'||quote_ident(t.table_name))) AS "size"
        FROM information_schema.tables t
        LEFT JOIN pg_stat_user_tables s ON s.relname = t.table_name AND s.schemaname = t.table_schema
        WHERE t.table_schema = $1 AND t.table_type = 'BASE TABLE'
        ORDER BY t.table_name;
      `

      const result = await pool.query(query, [schema])
      return { tables: result.rows }
    } catch (error) {
      // Enhanced error handling with more details
      let message = 'Unknown error'
      let code = ''
      let stack = ''

      if (error instanceof Error) {
        message = error.message || 'No error message'
        code = (error as any).code || ''
        stack = error.stack || ''
      } else if (typeof error === 'string') {
        message = error
      } else if (error && typeof error === 'object') {
        message = (error as any).message || (error as any).toString?.() || JSON.stringify(error)
        code = (error as any).code || ''
      }

      // Check for AggregateError (contains multiple connection errors)
      if (code === 'ETIMEDOUT' || message.includes('ETIMEDOUT') || message.includes('timeout') || message.includes('TIMEOUT')) {
        throw new Error(`Database connection timeout. This usually means:\n` +
          `1. The database server is not reachable (check network/firewall)\n` +
          `2. The database is in sleep mode (try accessing it directly to wake it up)\n` +
          `3. IPv6 connectivity issues (trying to force IPv4)\n` +
          `Original error: ${message}`);
      }

      if (code === 'ENOTFOUND' || message.includes('ENOTFOUND') || message.includes('getaddrinfo')) {
        throw new Error(`Database host not found. Check the hostname in your DATABASE_URL.\nOriginal error: ${message}`);
      }

      if (code === 'ECONNREFUSED' || message.includes('ECONNREFUSED')) {
        throw new Error(`Connection refused. Check if the database is running and accessible.\nOriginal error: ${message}`);
      }

      throw new Error(`Failed to get schema: ${message}${code ? ` (code: ${code})` : ''}`)
    }
    // Note: pool is NOT closed here - connection manager handles pooling
  },
})
