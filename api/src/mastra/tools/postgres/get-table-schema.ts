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

export const getTableSchemaTool = createTool({
  id: 'get-table-schema',
  description: 'Get detailed schema information for a specific table including columns, data types, and constraints',
  inputSchema: z.object({
    connectionString: z.string().describe('PostgreSQL connection string'),
    tableName: z.string().describe('Name of the table'),
    schema: z.string().default('public').describe('Schema name (default: public)'),
  }),
  execute: async ({ connectionString, tableName, schema = 'public' }) => {
    const pool = await getPool(connectionString);

    try {
      const query = `
        SELECT
          column_name AS "columnName",
          data_type AS "dataType",
          is_nullable AS "isNullable",
          column_default AS "columnDefault",
          character_maximum_length AS "maxLength"
        FROM information_schema.columns
        WHERE table_schema = $1 AND table_name = $2
        ORDER BY ordinal_position;
      `;

      const result = await pool.query(query, [schema, tableName]);

      return {
        tableName,
        schemaName: schema,
        columns: result.rows,
      };
    } finally {
      await pool.end();
    }
  },
});
