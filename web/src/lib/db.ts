/**
 * Database connection utility for PostgreSQL using pg driver
 */

import { Pool } from 'pg';

const CONNECTION_STRING = process.env.NEON_DATABASE_URL || "";

if (!CONNECTION_STRING) {
  console.warn("WARNING: NEON_DATABASE_URL environment variable is not set. Dashboard data will not be available.");
}

// Parse connection string to explicit params (avoids Next.js SSL parse issues)
function parseConnectionString(connStr: string) {
  try {
    const url = new URL(connStr);
    return {
      host: url.hostname,
      port: parseInt(url.port) || 5432,
      database: url.pathname.replace(/^\//, ""),
      user: decodeURIComponent(url.username),
      password: decodeURIComponent(url.password),
      ssl: { rejectUnauthorized: false },
    };
  } catch {
    return { connectionString: connStr, ssl: { rejectUnauthorized: false } };
  }
}

// Singleton pool
let pool: Pool | null = null;

function getPool(): Pool {
  if (!pool) {
    if (!CONNECTION_STRING) {
      throw new Error("NEON_DATABASE_URL environment variable is not set");
    }
    pool = new Pool({
      ...parseConnectionString(CONNECTION_STRING),
      max: 5,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });
  }
  return pool;
}

/**
 * Execute a SQL query and return the rows
 */
export async function queryNeon(query: string, params: any[] = []): Promise<any[]> {
  if (!CONNECTION_STRING) {
    throw new Error("NEON_DATABASE_URL environment variable is not set");
  }

  const p = getPool();
  try {
    const result = await p.query(query, params);
    return result.rows;
  } catch (error) {
    console.error("Database query error:", error);
    throw error;
  }
}

/**
 * Get connection string
 */
export const getConnectionString = () => CONNECTION_STRING;

/**
 * Close the connection pool
 */
export async function closePool() {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

// Legacy alias
export async function createClient() {
  const { Client } = await import("pg");
  const client = new Client({
    ...parseConnectionString(CONNECTION_STRING),
  });
  return client;
}
