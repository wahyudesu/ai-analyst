import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

function parseConnectionString(connectionString: string) {
  try {
    const url = new URL(connectionString);
    return {
      host: url.hostname,
      port: parseInt(url.port) || 5432,
      database: url.pathname.slice(1),
      user: url.username,
      password: url.password,
      ssl: url.searchParams.get('sslmode') === 'require',
    };
  } catch {
    throw new Error('Invalid connection string format');
  }
}

async function getPool(connectionString: string) {
  const pg = await import('pg');
  const { Pool } = pg.default || pg;
  const conn = parseConnectionString(connectionString);

  return new Pool({
    host: conn.host,
    port: conn.port,
    database: conn.database,
    user: conn.user,
    password: conn.password,
    ssl: conn.ssl ? { rejectUnauthorized: false } : undefined,
    max: 1,
  });
}

export const listTablesTool = createTool({
  id: 'list-tables',
  description: 'List all tables in the PostgreSQL database with row count and size information',
  inputSchema: z.object({
    connectionString: z.string().describe('PostgreSQL connection string'),
    schema: z.string().default('public').describe('Schema name (default: public)'),
  }),
  execute: async ({ connectionString, schema = 'public' }) => {
    const pool = await getPool(connectionString);

    try {
      const query = `
        SELECT
          t.table_name AS "tableName",
          COALESCE(s.n_live_tup, 0) AS "rowCount",
          pg_size_pretty(pg_total_relation_size(quote_ident(t.table_schema)||'.'||quote_ident(t.table_name))) AS "size"
        FROM information_schema.tables t
        LEFT JOIN pg_stat_user_tables s ON s.relname = t.table_name AND s.schemaname = t.table_schema
        WHERE t.table_schema = $1 AND t.table_type = 'BASE TABLE'
        ORDER BY t.table_name;
      `;

      const result = await pool.query(query, [schema]);
      return { tables: result.rows };
    } finally {
      await pool.end();
    }
  },
});
