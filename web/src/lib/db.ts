/**
 * Database connection utility for PostgreSQL using pg driver
 * With retry logic and connection recovery for serverless DBs like Neon
 */

import { Pool } from 'pg';
import dns from 'dns';

const CONNECTION_STRING = process.env.NEON_DATABASE_URL || "";

if (!CONNECTION_STRING) {
  console.warn("WARNING: NEON_DATABASE_URL environment variable is not set. Dashboard data will not be available.");
}

// Pre-resolve hostname to IPv4 to avoid IPv6 connection issues
let resolvedHost: string | null = null;

async function resolveHostname(hostname: string): Promise<string> {
  if (resolvedHost) return resolvedHost;
  
  try {
    const addresses = await dns.promises.resolve4(hostname);
    if (addresses && addresses.length > 0) {
      resolvedHost = addresses[0];
      console.log(`[DB] Resolved ${hostname} to IPv4: ${resolvedHost}`);
      return resolvedHost;
    }
  } catch (err) {
    console.warn(`[DB] Failed to resolve ${hostname} to IPv4, using hostname:`, err);
  }
  return hostname;
}

// Parse connection string to explicit params
function parseConnectionString(connStr: string, resolvedIp?: string) {
  try {
    const url = new URL(connStr);
    const hostname = url.hostname;
    
    return {
      host: resolvedIp || hostname, // Use resolved IP for connection
      port: parseInt(url.port) || 5432,
      database: url.pathname.replace(/^\//, ""),
      user: decodeURIComponent(url.username),
      password: decodeURIComponent(url.password),
        ssl: { 
          rejectUnauthorized: false,
          minVersion: 'TLSv1.2' as const,
          servername: hostname // Keep original hostname for SNI/SSL
        },
    };
  } catch {
    return { connectionString: connStr, ssl: { rejectUnauthorized: false } };
  }
}

// Singleton pool
let pool: Pool | null = null;
let poolInitPromise: Promise<Pool> | null = null;

async function getPool(): Promise<Pool> {
  // If pool exists and seems healthy, return it
  if (pool) {
    return pool;
  }
  
  // If initialization is in progress, wait for it
  if (poolInitPromise) {
    return poolInitPromise;
  }
  
  // Start initialization
  poolInitPromise = (async () => {
    if (!CONNECTION_STRING) {
      throw new Error("NEON_DATABASE_URL environment variable is not set");
    }
    
    const url = new URL(CONNECTION_STRING);
    const hostname = url.hostname;
    const resolvedIp = await resolveHostname(hostname);
    
    pool = new Pool({
      ...parseConnectionString(CONNECTION_STRING, resolvedIp),
      max: 3, // Smaller pool for serverless
      idleTimeoutMillis: 20000,
      connectionTimeoutMillis: 15000,
    });
    
    pool.on('error', (err) => {
      console.error('[DB] Pool error:', err.message);
      // Don't nullify pool here, let it recover
    });
    
    return pool;
  })();
  
  try {
    return await poolInitPromise;
  } catch (err) {
    poolInitPromise = null;
    throw err;
  }
}

/**
 * Execute a SQL query with retry logic
 */
export async function queryNeon(query: string, params: any[] = [], maxRetries = 2): Promise<any[]> {
  if (!CONNECTION_STRING) {
    throw new Error("NEON_DATABASE_URL environment variable is not set");
  }

  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const p = await getPool();
      const result = await p.query(query, params);
      return result.rows;
    } catch (error: any) {
      lastError = error;
      const isConnectionError = 
        error.code === 'ECONNRESET' ||
        error.code === 'ETIMEDOUT' ||
        error.code === 'ENOTFOUND' ||
        error.code === '57P01' || // Server terminated
        error.name === 'AggregateError' ||
        error.message?.includes('connection');
      
      if (isConnectionError && attempt < maxRetries) {
        console.warn(`[DB] Connection error on attempt ${attempt + 1}, retrying...`, error.message || error.code);
        // Reset pool for connection errors
        if (pool) {
          try {
            await pool.end();
          } catch {}
          pool = null;
          poolInitPromise = null;
          resolvedHost = null; // Re-resolve DNS on retry
        }
        await new Promise(r => setTimeout(r, 500 * (attempt + 1))); // Exponential backoff
        continue;
      }
      
      console.error("[DB] Query error:", error.message || error);
      throw error;
    }
  }
  
  throw lastError;
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
    poolInitPromise = null;
  }
}

// Cleanup on process exit
process.on('beforeExit', async () => {
  await closePool();
});

// Legacy alias
export async function createClient() {
  const { Client } = await import("pg");
  if (!CONNECTION_STRING) {
    throw new Error("NEON_DATABASE_URL environment variable is not set");
  }
  const url = new URL(CONNECTION_STRING);
  const resolvedIp = await resolveHostname(url.hostname);
  const client = new Client({
    ...parseConnectionString(CONNECTION_STRING, resolvedIp),
  });
  return client;
}
