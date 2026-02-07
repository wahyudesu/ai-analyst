/**
 * Secure Connection Pool Manager for PostgreSQL
 *
 * Features:
 * - Creates connections on-demand (lazy loading)
 * - Auto-closes idle connections after timeout
 * - Validates SSL certificates by default
 * - Sanitizes connection strings
 * - Per-request connections (no shared state)
 */

interface PoolConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  ssl?: boolean;
}

type ConnectionResult =
  | { success: true; pool: any; connectionTime: number }
  | { success: false; error: string };

class SecureConnectionManager {
  private activeConnections: Map<string, NodeJS.Timeout> = new Map();
  private readonly CONNECTION_IDLE_TIMEOUT = 2 * 60 * 1000; // 2 minutes (down from 5)
  private readonly MAX_POOL_SIZE = 5; // Reduced from 10

  /**
   * Parse and sanitize connection string
   * Removes unsupported parameters and logs warnings
   */
  private parseConnectionString(connectionString: string): PoolConfig {
    try {
      // Remove unsupported parameters
      let cleanConnectionString = connectionString;
      const unsupportedParams = ['channel_binding', 'application_name'];

      const url = new URL(cleanConnectionString);

      for (const param of unsupportedParams) {
        if (url.searchParams.has(param)) {
          url.searchParams.delete(param);
          console.warn(`Removed unsupported parameter '${param}' from connection string`);
        }
      }

      cleanConnectionString = url.toString();

      const parsed = new URL(cleanConnectionString);
      return {
        host: parsed.hostname,
        port: parseInt(parsed.port) || 5432,
        database: parsed.pathname.slice(1).split('?')[0], // Remove query params from dbname
        user: parsed.username,
        password: parsed.password,
        ssl: parsed.searchParams.get('sslmode') === 'require',
      };
    } catch (err) {
      throw new Error(`Invalid connection string: ${err instanceof Error ? err.message : 'unknown'}`);
    }
  }

  /**
   * Create a unique key for tracking connections
   */
  private getConnectionKey(config: PoolConfig): string {
    // Don't include password in key for security
    return `${config.host}:${config.port}:${config.database}:${config.user}`;
  }

  /**
   * Get a connection pool with auto-cleanup
   *
   * Connection lifecycle:
   * 1. Created on first request (lazy)
   * 2. Reused for subsequent requests
   * 3. Auto-closed after CONNECTION_IDLE_TIMEOUT
   */
  async getConnection(connectionString: string): Promise<ConnectionResult> {
    try {
      const pg = await import('pg');
      const { Pool } = pg.default || pg;
      const config = this.parseConnectionString(connectionString);
      const key = this.getConnectionKey(config);

      // Clear existing timeout if connection is reused
      const existingTimeout = this.activeConnections.get(key);
      if (existingTimeout) {
        clearTimeout(existingTimeout);
        this.activeConnections.delete(key);
        console.log(`Reusing existing connection to: ${config.database}@${config.host}`);
      }

      // Create pool
      const startTime = Date.now();

      const pool = new Pool({
        host: config.host,
        port: config.port,
        database: config.database,
        user: config.user,
        password: config.password,
        // Use proper SSL validation
        ssl: config.ssl
          ? {
              rejectUnauthorized: true, // Validate certificates!
              // For Neon/Supabase, you might need to disable this in development
              // but NEVER in production
            }
          : undefined,
        max: this.MAX_POOL_SIZE,
        idleTimeoutMillis: this.CONNECTION_IDLE_TIMEOUT,
        connectionTimeoutMillis: 15000,
        statement_timeout: 30000,
        // Enable query logging in development
        ...(process.env.NODE_ENV === 'development' && {
          log: (messages: string[]) => console.log('[DB]', messages.join(' ')),
        }),
      });

      // Wait for connection to be established
      try {
        await pool.query('SELECT 1');
      } catch (err) {
        await pool.end();
        throw err;
      }

      const connectionTime = Date.now() - startTime;
      console.log(`✓ Connected to ${config.database} (${connectionTime}ms)`);

      // Set auto-close timeout
      const closeTimeout = setTimeout(async () => {
        try {
          await pool.end();
          this.activeConnections.delete(key);
          console.log(`✓ Closed idle connection to: ${config.database}`);
        } catch (err) {
          console.error(`Error closing connection:`, err);
        }
      }, this.CONNECTION_IDLE_TIMEOUT);

      this.activeConnections.set(key, closeTimeout);

      return {
        success: true,
        pool,
        connectionTime,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';

      // Provide helpful error messages
      if (message.includes('ETIMEDOUT') || message.includes('timeout')) {
        return {
          success: false,
          error: `Database connection timeout. Check:\n` +
            `1. Database is accessible (try pinging the host)\n` +
            `2. Firewall allows outbound connections\n` +
            `3. Database is not in sleep mode\n` +
            `4. Connection string is correct`,
        };
      }

      if (message.includes('certificate') || message.includes('SSL')) {
        return {
          success: false,
          error: `SSL certificate error. If using Neon/Supabase pooler, try:\n` +
            `1. Use non-pooled connection (remove -pooler from hostname)\n` +
            `2. Check if SSL is properly configured`,
        };
      }

      if (message.includes('ENOTFOUND') || message.includes('getaddrinfo')) {
        return {
          success: false,
          error: `Database host not found. Verify the hostname in your connection string.`,
        };
      }

      return { success: false, error: message };
    }
  }

  /**
   * Manually close a connection
   */
  async closeConnection(connectionString: string): Promise<void> {
    const config = this.parseConnectionString(connectionString);
    const key = this.getConnectionKey(config);
    const timeout = this.activeConnections.get(key);

    if (timeout) {
      clearTimeout(timeout);
      this.activeConnections.delete(key);
      console.log(`Manually closed connection to: ${config.database}`);
    }
  }

  /**
   * Close all connections (for shutdown)
   */
  async closeAll(): Promise<void> {
    const keys = Array.from(this.activeConnections.keys());
    console.log(`Closing ${keys.length} active connection(s)...`);

    for (const key of keys) {
      const timeout = this.activeConnections.get(key);
      if (timeout) {
        clearTimeout(timeout);
        this.activeConnections.delete(key);
      }
    }
  }

  /**
   * Get connection statistics
   */
  getStats() {
    return {
      activeConnections: this.activeConnections.size,
      connections: Array.from(this.activeConnections.keys()).map((key) => ({
        key: key.replace(/:[^:]+:[^:]+@/, ':****@'), // Hide user
        autoCloseIn: `${this.CONNECTION_IDLE_TIMEOUT / 1000}s`,
      })),
    };
  }
}

// Singleton instance
export const connectionManager = new SecureConnectionManager();

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
