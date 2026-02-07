/**
 * Connection Pool Manager for PostgreSQL
 * Reuses connections across tool calls to improve performance
 */

import dns from 'dns';

interface PoolConfig {
  host: string;
  // Resolved IPv4 address (pre-resolved to avoid IPv6 issues)
  resolvedHost?: string;
  port: number;
  database: string;
  user: string;
  password: string;
  ssl?: boolean;
}

interface ManagedPool {
  pool: any;
  lastUsed: number;
  refCount: number;
}

class ConnectionManager {
  private pools: Map<string, ManagedPool> = new Map();
  private readonly DEFAULT_MAX_SIZE = 10;
  private readonly IDLE_TIMEOUT = 5 * 60 * 1000; // 5 minutes
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Start cleanup interval for idle pools
    this.startCleanup();
  }

  /**
   * Parse connection string into config
   * Removes unsupported parameters like channel_binding
   */
  private async parseConnectionString(connectionString: string): Promise<PoolConfig> {
    try {
      // Remove unsupported parameters that can cause connection issues
      let cleanConnectionString = connectionString;
      if (cleanConnectionString.includes('channel_binding')) {
        const url = new URL(cleanConnectionString);
        url.searchParams.delete('channel_binding');
        cleanConnectionString = url.toString();
        console.log('Removed unsupported channel_binding parameter from connection string');
      }

      const url = new URL(cleanConnectionString);
      const hostname = url.hostname;

      // Pre-resolve to IPv4 to avoid IPv6 connection issues with node-postgres Pool
      let resolvedHost = hostname;
      try {
        const addresses = await dns.promises.resolve4(hostname);
        if (addresses && addresses.length > 0) {
          resolvedHost = addresses[0];
          console.log(`Resolved ${hostname} to IPv4: ${resolvedHost}`);
        }
      } catch (dnsErr) {
        console.warn(`Failed to resolve ${hostname} to IPv4, using hostname:`, dnsErr);
        // Fall back to hostname
      }

      return {
        host: hostname, // Keep original for SNI/SSL
        resolvedHost, // Use resolved IP for connection
        port: parseInt(url.port) || 5432,
        database: url.pathname.slice(1),
        user: url.username,
        password: url.password,
        ssl: url.searchParams.get('sslmode') === 'require',
      };
    } catch (err) {
      throw new Error(`Invalid connection string format: ${err instanceof Error ? err.message : 'unknown error'}`);
    }
  }

  /**
   * Generate a unique key for the pool map
   */
  private getPoolKey(config: PoolConfig): string {
    return `${config.host}:${config.port}:${config.database}:${config.user}`;
  }

  /**
   * Get or create a connection pool
   */
  async getPool(connectionString: string, maxSize: number = this.DEFAULT_MAX_SIZE) {
    const pg = await import('pg');
    const { Pool } = pg.default || pg;
    const config = await this.parseConnectionString(connectionString);
    const key = this.getPoolKey(config);

    // Return existing pool if available
    if (this.pools.has(key)) {
      const managed = this.pools.get(key)!;
      managed.lastUsed = Date.now();
      managed.refCount++;
      return managed.pool;
    }

    // Create new pool with better timeout settings for serverless/remote DBs
    // Note: For Neon databases, we use resolved IPv4 address to avoid IPv6 connection issues
    const pool = new Pool({
      host: config.resolvedHost || config.host, // Use pre-resolved IPv4 address
      port: config.port,
      database: config.database,
      user: config.user,
      password: config.password,
      ssl: config.ssl ? { rejectUnauthorized: false, minVersion: 'TLSv1.2', servername: config.host } : undefined,
      max: maxSize,
      idleTimeoutMillis: this.IDLE_TIMEOUT,
      connectionTimeoutMillis: 30000, // 30 seconds
      statement_timeout: 30000, // 30 second query timeout
    });

    // Handle pool errors
    pool.on('error', (err: Error) => {
      console.error('PostgreSQL pool error:', err);
    });

    const managedPool: ManagedPool = {
      pool,
      lastUsed: Date.now(),
      refCount: 1,
    };

    this.pools.set(key, managedPool);
    return pool;
  }

  /**
   * Release a pool reference (decrements ref count)
   * Call this when done with a connection, but pool won't close immediately
   */
  release(pool: any) {
    for (const [key, managed] of this.pools.entries()) {
      if (managed.pool === pool) {
        managed.refCount = Math.max(0, managed.refCount - 1);
        managed.lastUsed = Date.now();
        break;
      }
    }
  }

  /**
   * Close a specific pool
   */
  async closePool(connectionString: string) {
    const pg = await import('pg');
    const config = await this.parseConnectionString(connectionString);
    const key = this.getPoolKey(config);

    const managed = this.pools.get(key);
    if (managed) {
      await managed.pool.end();
      this.pools.delete(key);
    }
  }

  /**
   * Close all pools
   */
  async closeAll() {
    const closePromises: Promise<void>[] = [];

    for (const managed of this.pools.values()) {
      closePromises.push(managed.pool.end());
    }

    await Promise.all(closePromises);
    this.pools.clear();

    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * Start periodic cleanup of idle pools
   */
  private startCleanup() {
    this.cleanupInterval = setInterval(async () => {
      const now = Date.now();
      const keysToDelete: string[] = [];

      for (const [key, managed] of this.pools.entries()) {
        // Clean up pools that haven't been used recently and have no refs
        if (managed.refCount === 0 && now - managed.lastUsed > this.IDLE_TIMEOUT) {
          keysToDelete.push(key);
        }
      }

      for (const key of keysToDelete) {
        const managed = this.pools.get(key);
        if (managed) {
          try {
            await managed.pool.end();
            this.pools.delete(key);
            console.log(`Closed idle pool: ${key}`);
          } catch (err) {
            console.error(`Error closing pool ${key}:`, err);
          }
        }
      }
    }, 60000); // Check every minute
  }

  /**
   * Get pool statistics for monitoring
   */
  getStats() {
    return {
      totalPools: this.pools.size,
      pools: Array.from(this.pools.entries()).map(([key, managed]) => ({
        key,
        refCount: managed.refCount,
        lastUsed: new Date(managed.lastUsed).toISOString(),
        idleTime: Date.now() - managed.lastUsed,
      })),
    };
  }
}

// Singleton instance
export const connectionManager = new ConnectionManager();

// Ensure cleanup on process exit
process.on('beforeExit', async () => {
  await connectionManager.closeAll();
});

process.on('SIGINT', async () => {
  await connectionManager.closeAll();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await connectionManager.closeAll();
  process.exit(0);
});
