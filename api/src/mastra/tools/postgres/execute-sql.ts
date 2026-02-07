import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { validateSQLQuery, sanitizeSQLQuery } from './sql-validator';
import { connectionManager } from '../../../db/connection-manager.ts';

export const executeSQLTool = createTool({
  id: 'execute-sql',
  description: `Execute a SQL query on PostgreSQL database. Use for SELECT queries only.

IMPORTANT SECURITY RULES:
- Only SELECT queries are allowed (INSERT, UPDATE, DELETE, DROP, etc. are blocked)
- Multi-statement queries (with semicolons) are not allowed
- Query validation is performed to prevent SQL injection
- Consider adding LIMIT to prevent large result sets

CONNECTION MANAGEMENT:
- Connections are pooled and reused for better performance
- Pools are automatically closed after 5 minutes of inactivity

Returns columns, rows, execution time, and any validation warnings.`,
  inputSchema: z.object({
    connectionString: z.string().default(process.env.DATABASE_URL || '').describe('PostgreSQL connection string (optional - uses DATABASE_URL from env if not provided)'),
    query: z.string().describe('SQL query to execute (SELECT only)'),
  }),
  execute: async ({ connectionString = process.env.DATABASE_URL || '', query }) => {
    // Check if DATABASE_URL is set
    if (!connectionString) {
      throw new Error('DATABASE_URL environment variable is not set. Please configure your PostgreSQL connection string.');
    }

    // Validate and sanitize query
    const validation = validateSQLQuery(query);

    if (!validation.isValid) {
      throw new Error(`SQL Query Validation Failed: ${validation.error}`);
    }

    const sanitizedQuery = sanitizeSQLQuery(query);
    const startTime = Date.now();

    // Get pool from connection manager (reuses existing connections)
    try {
      const pool = await connectionManager.getPool(connectionString);

      // Add query timeout for safety
      const result = await Promise.race([
        pool.query(sanitizedQuery),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Query timeout (30s)')), 30000)
        ),
      ]) as any;

      return {
        columns: result.fields.map((f: any) => f.name),
        rows: result.rows,
        rowCount: result.rowCount || 0,
        executionTime: Date.now() - startTime,
        warnings: validation.warnings,
      };
    } catch (error) {
      // Enhanced error handling with more details
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

      // Provide helpful error messages for common issues
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

      if (code === '3D000' || message.includes('database') && message.includes('does not exist')) {
        throw new Error(`Database does not exist. Check the database name in your DATABASE_URL.\nOriginal error: ${message}`);
      }

      throw new Error(`Query execution failed: ${message}${code ? ` (code: ${code})` : ''}`);
    }
    // Note: pool is NOT closed here - connection manager handles pooling
    // finally { await pool.end(); }  // REMOVED - let manager handle it
  },
});
