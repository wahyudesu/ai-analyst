import { MastraRoute } from "@mastra/core/server";

/**
 * Direct SQL execution route for dashboard
 * Bypasses agent reasoning for faster query execution
 */
export const sqlRoute = new MastraRoute({
  method: "POST",
  path: "/sql",
  handler: async (c) => {
    const { query } = await c.req.json();

    if (!query || typeof query !== "string") {
      return c.json({ error: "SQL query is required" }, 400);
    }

    // Security: Only allow SELECT queries
    const trimmedQuery = query.trim().toUpperCase();
    if (!trimmedQuery.startsWith("SELECT")) {
      return c.json({ error: "Only SELECT queries are allowed" }, 400);
    }

    try {
      const { connectionManager } = await import("../../db/connection-manager.ts");
      const pool = await connectionManager.getPool(process.env.DATABASE_URL!);

      const result = await pool.query(query);

      return c.json({
        columns: result.fields.map((f: any) => f.name),
        rows: result.rows,
        rowCount: result.rowCount || 0,
      });
    } catch (error: any) {
      console.error("SQL execution error:", error);
      return c.json(
        {
          error: "Query execution failed",
          message: error.message || String(error),
        },
        500
      );
    }
  },
});
