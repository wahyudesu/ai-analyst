import { createTool } from "@mastra/core/tools"
import { z } from "zod"
import { connectionManager } from "../../../db/connection-manager.ts"
import { getDatabaseUrl } from "../../lib/request-context.js"

export const getTableTool = createTool({
  id: "get-table",
  description:
    "Get detailed schema information for one or several specific tables including columns, data types, and constraints. Use this after get-schema to understand the structure of specific tables you want to query. The database connection is automatically provided - do not ask the user for it.",
  inputSchema: z.object({
    tableNames: z
      .array(z.string())
      .min(1)
      .describe("Name(s) of the table(s) to get schema for"),
    schema: z
      .string()
      .default("public")
      .describe("Schema name (default: public)"),
  }),
  execute: async ({ tableNames, schema = "public" }) => {
    // Get connection string from secure request context (not from LLM)
    const connectionString = getDatabaseUrl() || process.env.DATABASE_URL || '';

    if (!connectionString) {
      throw new Error('DATABASE_URL environment variable is not set. Please configure your PostgreSQL connection string.');
    }

    try {
      const pool = await connectionManager.getPool(connectionString)

      const query = `
        SELECT
          table_name AS "tableName",
          column_name AS "columnName",
          data_type AS "dataType",
          is_nullable AS "isNullable",
          column_default AS "columnDefault",
          character_maximum_length AS "maxLength"
        FROM information_schema.columns
        WHERE table_schema = $1 AND table_name = ANY($2)
        ORDER BY table_name, ordinal_position;
      `

      const result = await pool.query(query, [schema, tableNames])

      const tablesMap = new Map<string, Array<any>>()
      for (const row of result.rows) {
        const tableName = row.tableName
        if (!tablesMap.has(tableName)) {
          tablesMap.set(tableName, [])
        }
        tablesMap.get(tableName)!.push({
          columnName: row.columnName,
          dataType: row.dataType,
          isNullable: row.isNullable,
          columnDefault: row.columnDefault,
          maxLength: row.maxLength,
        })
      }

      const tables = Array.from(tablesMap.entries()).map(
        ([tableName, columns]) => ({
          tableName,
          schemaName: schema,
          columns,
        })
      )

      return { tables }
    } catch (error) {
      // Enhanced error handling
      let message = 'Unknown error'
      let code = ''

      if (error instanceof Error) {
        message = error.message || 'No error message'
        code = (error as any).code || ''
      } else if (typeof error === 'string') {
        message = error
      } else if (error && typeof error === 'object') {
        message = (error as any).message || (error as any).toString?.() || JSON.stringify(error)
        code = (error as any).code || ''
      }

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

      throw new Error(`Failed to get table schema: ${message}${code ? ` (code: ${code})` : ''}`)
    }
    // Note: pool is NOT closed here - connection manager handles pooling
  },
})
