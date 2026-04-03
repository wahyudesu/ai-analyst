/**
 * Database connection utility for PostgreSQL using pg driver
 * With retry logic and connection recovery for serverless DBs like Neon
 */

import dns from "dns"
import { Client, Pool } from "pg"

const DEFAULT_CONNECTION_STRING = process.env.DATABASE_URL || ""

if (!DEFAULT_CONNECTION_STRING) {
  console.warn(
    "WARNING: DATABASE_URL environment variable is not set. Dashboard data will not be available."
  )
}

/**
 * Get connection string - supports custom database URL
 * @param customUrl - Optional custom database URL (from UI settings)
 */
export function getConnectionString(customUrl?: string): string {
  return customUrl || DEFAULT_CONNECTION_STRING
}

// Cache for resolved hosts and pools per connection string
const resolvedHosts = new Map<string, string>()
const pools = new Map<string, Pool>()
const poolInitPromises = new Map<string, Promise<Pool>>()

async function resolveHostname(hostname: string): Promise<string> {
  if (resolvedHosts.has(hostname)) {
    return resolvedHosts.get(hostname)!
  }

  try {
    const addresses = await dns.promises.resolve4(hostname)
    if (addresses && addresses.length > 0) {
      const resolvedIp = addresses[0]
      resolvedHosts.set(hostname, resolvedIp)
      console.log(`[DB] Resolved ${hostname} to IPv4: ${resolvedIp}`)
      return resolvedIp
    }
  } catch (err) {
    console.warn(
      `[DB] Failed to resolve ${hostname} to IPv4, using hostname:`,
      err
    )
  }
  return hostname
}

function parseConnectionString(connStr: string, resolvedIp?: string) {
  try {
    const url = new URL(connStr)
    const hostname = url.hostname

    return {
      host: resolvedIp || hostname,
      port: Number.parseInt(url.port) || 5432,
      database: url.pathname.replace(/^\//, ""),
      user: decodeURIComponent(url.username),
      password: decodeURIComponent(url.password),
      ssl: {
        rejectUnauthorized: false,
        minVersion: "TLSv1.2" as const,
        servername: hostname,
      },
    }
  } catch {
    return { connectionString: connStr, ssl: { rejectUnauthorized: false } }
  }
}

async function getPool(customUrl?: string): Promise<Pool> {
  const connectionString = getConnectionString(customUrl)
  if (!connectionString) {
    throw new Error("Database connection string is not set")
  }

  // Use connection string as key for pool cache
  const poolKey = connectionString

  // If pool exists and seems healthy, return it
  if (pools.has(poolKey)) {
    return pools.get(poolKey)!
  }

  // If initialization is in progress, wait for it
  if (poolInitPromises.has(poolKey)) {
    return poolInitPromises.get(poolKey)!
  }

  // Start initialization
  poolInitPromises.set(
    poolKey,
    (async () => {
      const url = new URL(connectionString)
      const hostname = url.hostname
      const resolvedIp = await resolveHostname(hostname)

      const pool = new Pool({
        ...parseConnectionString(connectionString, resolvedIp),
        max: 3,
        idleTimeoutMillis: 20000,
        connectionTimeoutMillis: 15000,
      })

      pool.on("error", err => {
        console.error("[DB] Pool error:", err.message)
      })

      pools.set(poolKey, pool)
      return pool
    })()
  )

  try {
    return await poolInitPromises.get(poolKey)!
  } catch (err) {
    poolInitPromises.delete(poolKey)
    throw err
  }
}

/**
 * Execute a SQL query with retry logic
 * @param query - SQL query string
 * @param params - Query parameters
 * @param customUrl - Optional custom database URL (from UI settings)
 * @param maxRetries - Maximum retry attempts
 */
export async function queryNeon(
  query: string,
  params: any[] = [],
  customUrl?: string,
  maxRetries = 2
): Promise<any[]> {
  const connectionString = getConnectionString(customUrl)
  if (!connectionString) {
    throw new Error("Database connection string is not set")
  }

  let lastError: Error | null = null
  const poolKey = connectionString

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const p = await getPool(customUrl)
      const result = await p.query(query, params)
      return result.rows
    } catch (error: any) {
      lastError = error
      const isConnectionError =
        error.code === "ECONNRESET" ||
        error.code === "ETIMEDOUT" ||
        error.code === "ENOTFOUND" ||
        error.code === "57P01" ||
        error.name === "AggregateError" ||
        error.message?.includes("connection")

      if (isConnectionError && attempt < maxRetries) {
        console.warn(
          `[DB] Connection error on attempt ${attempt + 1}, retrying...`,
          error.message || error.code
        )
        // Reset pool for this connection string
        if (pools.has(poolKey)) {
          try {
            await pools.get(poolKey)!.end()
          } catch {}
          pools.delete(poolKey)
          poolInitPromises.delete(poolKey)
          const url = new URL(connectionString)
          resolvedHosts.delete(url.hostname)
        }
        await new Promise(r => setTimeout(r, 500 * (attempt + 1)))
        continue
      }

      console.error("[DB] Query error:", error.message || error)
      throw error
    }
  }

  throw lastError
}

/**
 * Close a specific pool or all pools
 */
export async function closePool(customUrl?: string) {
  if (customUrl) {
    const poolKey = customUrl
    if (pools.has(poolKey)) {
      await pools.get(poolKey)!.end()
      pools.delete(poolKey)
      poolInitPromises.delete(poolKey)
    }
  } else {
    // Close all pools
    for (const [key, pool] of pools.entries()) {
      try {
        await pool.end()
      } catch {}
      pools.delete(key)
      poolInitPromises.delete(key)
    }
  }
}

// Cleanup on process exit
process.on("beforeExit", async () => {
  await closePool()
})

/**
 * Create a new database client (for single queries)
 * @param customUrl - Optional custom database URL (from UI settings)
 */
export async function createClient(customUrl?: string) {
  const connectionString = getConnectionString(customUrl)
  if (!connectionString) {
    throw new Error("Database connection string is not set")
  }
  const url = new URL(connectionString)
  const resolvedIp = await resolveHostname(url.hostname)
  const client = new Client({
    ...parseConnectionString(connectionString, resolvedIp),
  })
  return client
}
