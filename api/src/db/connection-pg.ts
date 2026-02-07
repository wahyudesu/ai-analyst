/**
 * PostgreSQL Connection using `pg` (node-postgres) library
 *
 * This is the most popular PostgreSQL driver for Node.js
 * GitHub: https://github.com/brianc/node-postgres
 */

import pg from 'pg';

const { Pool } = pg;

export interface PostgresConfig {
  host?: string;
  port?: number;
  database: string;
  user: string;
  password: string;
  ssl?: boolean;
}

export class PgConnection {
  private pool: pg.Pool | null = null;

  /**
   * Create a connection pool from connection string
   * Example: postgresql://user:password@host:port/database
   */
  static fromConnectionString(connectionString: string): PgConnection {
    const url = new URL(connectionString);
    const config: PostgresConfig = {
      host: url.hostname,
      port: parseInt(url.port) || 5432,
      database: url.pathname.slice(1),
      user: url.username,
      password: url.password,
      ssl: url.searchParams.get('sslmode') === 'require',
    };
    return new PgConnection(config);
  }

  constructor(private config: PostgresConfig) {}

  /**
   * Connect to the database
   */
  async connect(): Promise<void> {
    this.pool = new Pool({
      host: this.config.host || 'localhost',
      port: this.config.port || 5432,
      database: this.config.database,
      user: this.config.user,
      password: this.config.password,
      ssl: this.config.ssl ? { rejectUnauthorized: false } : undefined,
      max: 10,
      idleTimeoutMillis: 30000,
      // Force IPv4 to avoid IPv6 connection issues
      connectionTimeoutMillis: 10000,
    });

    // Test connection
    const client = await this.pool.connect();
    client.release();
    console.log('[pg] Connected successfully!');
  }

  /**
   * Execute a query
   */
  async query<T = any>(sql: string, params?: any[]): Promise<T[]> {
    if (!this.pool) {
      throw new Error('Not connected. Call connect() first.');
    }

    const start = Date.now();
    const result = await this.pool.query(sql, params);
    const duration = Date.now() - start;

    console.log(`[pg] Query executed in ${duration}ms`);
    return result.rows as T[];
  }

  /**
   * Execute a query with full result metadata
   */
  async queryWithMeta(sql: string, params?: any[]) {
    if (!this.pool) {
      throw new Error('Not connected. Call connect() first.');
    }

    const start = Date.now();
    const result = await this.pool.query(sql, params);
    const duration = Date.now() - start;

    return {
      rows: result.rows,
      columns: result.fields.map((f: any) => f.name),
      rowCount: result.rowCount || 0,
      executionTime: duration,
    };
  }

  /**
   * Get table schema
   */
  async getTableSchema(tableName: string): Promise<any[]> {
    const sql = `
      SELECT
        column_name,
        data_type,
        is_nullable,
        column_default,
        character_maximum_length
      FROM information_schema.columns
      WHERE table_name = $1
      ORDER BY ordinal_position
    `;
    return this.query(sql, [tableName]);
  }

  /**
   * List all tables
   */
  async listTables(): Promise<any[]> {
    const sql = `
      SELECT
        table_schema,
        table_name,
        (SELECT COUNT(*) FROM information_schema.columns
         WHERE table_name = t.table_name) as column_count
      FROM information_schema.tables t
      WHERE table_type = 'BASE TABLE'
      AND table_schema NOT IN ('pg_catalog', 'information_schema')
      ORDER BY table_schema, table_name
    `;
    return this.query(sql);
  }

  /**
   * Close the connection pool
   */
  async close(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
      console.log('[pg] Connection closed.');
    }
  }

  /**
   * Get the underlying Pool instance (for advanced use)
   */
  getPool(): pg.Pool | null {
    return this.pool;
  }
}

// Export singleton instance creator
export async function createPgConnection(config: PostgresConfig): Promise<PgConnection> {
  const conn = new PgConnection(config);
  await conn.connect();
  return conn;
}

export async function createPgConnectionFromUrl(connectionString: string): Promise<PgConnection> {
  const conn = PgConnection.fromConnectionString(connectionString);
  await conn.connect();
  return conn;
}
