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

export const executeSQLTool = createTool({
  id: 'execute-sql',
  description: 'Execute a SQL query on PostgreSQL database. Use for SELECT queries. Returns columns, rows, and execution time.',
  inputSchema: z.object({
    connectionString: z.string().describe('PostgreSQL connection string (postgresql://user:password@host:port/database)'),
    query: z.string().describe('SQL query to execute'),
  }),
  execute: async ({ connectionString, query }) => {
    const startTime = Date.now();
    const pool = await getPool(connectionString);

    try {
      const result = await pool.query(query);
      return {
        columns: result.fields.map((f) => f.name),
        rows: result.rows,
        rowCount: result.rowCount || 0,
        executionTime: Date.now() - startTime,
      };
    } finally {
      await pool.end();
    }
  },
});
