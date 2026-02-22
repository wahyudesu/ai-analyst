/**
 * Database connection utility for Neon PostgreSQL
 *
 * Uses pg (node-postgres) with connection pooling for reliable connectivity
 */

import { Pool } from "pg";

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

// Singleton connection pool
let pool: Pool | null = null;

/**
 * Get or create the connection pool
 */
function getPool(): Pool {
  if (!pool) {
    const connString = getConnectionString();

    // Parse connection string to extract components
    // We need to add the endpoint parameter for Neon's SNI support
    const url = new URL(connString);
    const host = url.hostname;
    const pathname = url.pathname.slice(1); // remove leading slash
    const searchParams = url.search;

    // Extract endpoint ID from hostname (format: ep-xxx-xxx.pooler.region.aws.neon.tech)
    const endpointId = host.split('.')[0];

    pool = new Pool({
      host: host,
      database: pathname,
      user: url.username,
      password: url.password,
      ssl: { rejectUnauthorized: false }, // Neon requires SSL
      options: `endpoint=${endpointId}`, // Required for Neon SNI support
      max: 10, // Maximum number of clients in the pool
      idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
      connectionTimeoutMillis: 10000, // Return error after 10 seconds if connection fails
    });

    // Handle pool errors
    pool.on('error', (err) => {
      console.error('Unexpected error on idle client', err);
      process.exit(-1);
    });
  }
  return pool;
}

/**
 * Execute a SQL query and return the rows
 */
export async function queryNeon(query: string, params: any[] = []): Promise<any[]> {
  if (!NEON_CONNECTION_STRING) {
    throw new Error("NEON_DATABASE_URL environment variable is not set");
  }

  const pool = getPool();

  try {
    const result = await pool.query(query, params);
    return result.rows;
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
 * Close the connection pool (useful for cleanup/shutdown)
 */
export async function closePool() {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
