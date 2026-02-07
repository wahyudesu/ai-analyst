import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { validateSQLQuery, sanitizeSQLQuery } from './sql-validator';

/**
 * Execute SQL tool with secure connection handling
 *
 * Security features:
 * - SQL injection validation
 * - Query timeout (30s)
 * - SELECT-only queries
 * - Per-request connections (auto-closed after 2min idle)
 * - Proper error messages without leaking credentials
 */
export const executeSQLTool = createTool({
  id: 'execute-sql',
  description: `Execute a SQL query on PostgreSQL database. Use for SELECT queries only.

SECURITY RULES:
- Only SELECT queries allowed (INSERT, UPDATE, DELETE, DROP are blocked)
- Multi-statement queries (semicolons) are not allowed
- Query validation prevents SQL injection
- Add LIMIT to prevent large result sets

CONNECTION:
- Connection created when tool is called
- Auto-closed after 2 minutes of inactivity
- Uses SSL with certificate validation

Returns: columns, rows, execution time, and warnings.`,
  inputSchema: z.object({
    connectionString: z
      .string()
      .default(process.env.DATABASE_URL || '')
      .describe('PostgreSQL connection string (uses DATABASE_URL env if not provided)'),
    query: z.string().describe('SQL SELECT query to execute'),
  }),
  execute: async ({ connectionString = process.env.DATABASE_URL || '', query }) => {
    // Validate connection string exists
    if (!connectionString) {
      throw new Error(
        'DATABASE_URL not configured. Please set the DATABASE_URL environment variable.',
      );
    }

    // Validate and sanitize query
    const validation = validateSQLQuery(query);
    if (!validation.isValid) {
      throw new Error(`Query validation failed: ${validation.error}`);
    }

    const sanitizedQuery = sanitizeSQLQuery(query);
    const startTime = Date.now();

    // Import connection manager dynamically
    const { connectionManager } = await import('../../../db/connection-manager-v2');

    // Get connection (creates or reuses)
    const connectionResult = await connectionManager.getConnection(connectionString);

    if (!connectionResult.success) {
      throw new Error(connectionResult.error);
    }

    const pool = connectionResult.pool;

    try {
      // Execute query with timeout
      const result = await Promise.race([
        pool.query(sanitizedQuery),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Query timeout (30s)')), 30000),
        ),
      ]) as any;

      return {
        columns: result.fields.map((f: any) => f.name),
        rows: result.rows,
        rowCount: result.rowCount || 0,
        executionTime: Date.now() - startTime,
        connectionTime: connectionResult.connectionTime,
        warnings: validation.warnings,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';

      // Sanitized error messages (don't leak credentials)
      if (message.includes('password') || message.includes('authentication')) {
        throw new Error('Authentication failed. Check your database credentials.');
      }

      if (message.includes('timeout') || message.includes('ETIMEDOUT')) {
        throw new Error('Query execution timeout. The query may be too complex or the database is slow.');
      }

      if (message.includes('relation') && message.includes('does not exist')) {
        throw new Error(`Table not found. Use get-schema tool first to see available tables.`);
      }

      throw new Error(`Query failed: ${message}`);
    }
    // Note: Connection auto-closes after 2min idle via connectionManager
  },
});
