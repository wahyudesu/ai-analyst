/**
 * Database connection utility for Neon PostgreSQL
 *
 * Uses @neondatabase/serverless for optimal serverless performance
 */

import { neon, neonConfig, NeonQueryFunction } from '@neondatabase/serverless';
import ws from 'ws';

// Configure WebSocket for Neon
neonConfig.fetchConnectionCache = true;
neonConfig.webSocketConstructor = ws as any;

const NEON_CONNECTION_STRING = process.env.NEON_DATABASE_URL || "";

if (!NEON_CONNECTION_STRING) {
  console.warn("WARNING: NEON_DATABASE_URL environment variable is not set. Dashboard data will not be available.");
}

/**
 * Get a connection string with proper SSL mode
 */
export const getConnectionString = () => {
  if (!NEON_CONNECTION_STRING) return "";
  return NEON_CONNECTION_STRING;
};

// Singleton SQL client
let sql: NeonQueryFunction<false, false> | null = null;

/**
 * Get or create the SQL client
 */
function getSql(): NeonQueryFunction<false, false> {
  if (!sql) {
    const connString = getConnectionString();
    if (!connString) {
      throw new Error("NEON_DATABASE_URL environment variable is not set");
    }
    sql = neon(connString);
  }
  return sql;
}

/**
 * Execute a SQL query and return the rows
 * Note: @neondatabase/serverless uses tagged template literals, not traditional params
 */
export async function queryNeon(query: string, params: any[] = []): Promise<any[]> {
  if (!NEON_CONNECTION_STRING) {
    throw new Error("NEON_DATABASE_URL environment variable is not set");
  }

  const sql = getSql();

  try {
    // Use .query() method for traditional param-based queries ($1, $2, etc.)
    const result = await (sql as any).query(query, params);
    return result as any[];
  } catch (error) {
    console.error("Database query error:", error);
    throw error;
  }
}

/**
 * Create a PostgreSQL client with pg (for compatibility)
 */
export async function createClient() {
  const { Client } = await import("pg");

  const client = new Client({
    connectionString: getConnectionString(),
    connectionTimeoutMillis: 10000,
  });

  return client;
}

/**
 * Close the connection pool (no-op for serverless)
 */
export async function closePool() {
  // Serverless connections don't need to be closed
  sql = null;
}
