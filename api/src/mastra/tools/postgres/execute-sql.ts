import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { validateSQLQueryV2, sanitizeSQLQueryV2, type ValidationResult } from './sql-validator-v2.js';
import { connectionManager } from '../../../db/connection-manager.js';
import { getDatabaseUrl } from '../../lib/request-context.js';
import {
  createDatabaseError,
  createSQLError,
  formatErrorForAgent,
} from '../../lib/errors.js';

export const executeSQLTool = createTool({
  id: 'execute-sql',
  description: `Execute a SQL query on PostgreSQL database. Use for SELECT queries only. The database connection is automatically provided - do not ask the user for it.

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
    query: z.string().describe('SQL query to execute (SELECT only)'),
  }),
  execute: async ({ query }) => {
    // Get connection string from secure request context (not from LLM)
    const connectionString = getDatabaseUrl() || process.env.DATABASE_URL || '';

    // Check if DATABASE_URL is set
    if (!connectionString) {
      throw new Error('DATABASE_URL environment variable is not set. Please configure your PostgreSQL connection string.');
    }

    // Validate and sanitize query with enhanced security
    const validation: ValidationResult = validateSQLQueryV2(query);

    if (!validation.isValid) {
      // Structured error response
      const errorDetail = {
        code: validation.code || 'SQL_VALIDATION_ERROR',
        message: validation.error || 'Query validation failed',
        suggestions: validation.suggestions || [],
      };
      throw new Error(`SQL Query Validation Failed [${errorDetail.code}]: ${errorDetail.message}${errorDetail.suggestions.length > 0 ? '\nSuggestions: ' + errorDetail.suggestions.join(', ') : ''}`);
    }

    const sanitizedQuery = sanitizeSQLQueryV2(query);
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
        complexityScore: validation.complexityScore,
        suggestions: validation.suggestions,
      };
    } catch (error) {
      // Use structured error responses
      const errorResponse = createDatabaseError(error);

      // Check if it's a SQL query error (not connection)
      if (error instanceof Error && error.message.includes('query')) {
        const sqlError = createSQLError(error, sanitizedQuery);
        throw new Error(formatErrorForAgent(sqlError));
      }

      throw new Error(formatErrorForAgent(errorResponse));
    }
    // Note: pool is NOT closed here - connection manager handles pooling
    // finally { await pool.end(); }  // REMOVED - let manager handle it
  },
});
