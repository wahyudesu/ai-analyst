import { registerApiRoute } from "@mastra/core/server"
import type { FieldDef } from "pg"

/**
 * Direct SQL execution route for dashboard
 * Bypasses agent reasoning for faster query execution
 */
export const sqlRoute = registerApiRoute("/sql", {
  method: "POST",
  handler: async c => {
    const { query } = await c.req.json()

    if (!query || typeof query !== "string") {
      return c.json({ error: "SQL query is required" }, 400)
    }

    // Security: Only allow SELECT queries
    const trimmedQuery = query.trim().toUpperCase()
    if (!trimmedQuery.startsWith("SELECT")) {
      return c.json({ error: "Only SELECT queries are allowed" }, 400)
    }

    try {
      const { connectionManager } = await import("../../db/connection-manager")
      const pool = await connectionManager.getPool(process.env.DATABASE_URL!)

      const result = await pool.query(query)

      return c.json({
        columns: result.fields.map((f: FieldDef) => f.name),
        rows: result.rows,
        rowCount: result.rowCount || 0,
      })
    } catch (error: unknown) {
      console.error("SQL execution error:", error)
      const message = error instanceof Error ? error.message : String(error)
      return c.json(
        {
          error: "Query execution failed",
          message,
        },
        500
      )
    }
  },
})
