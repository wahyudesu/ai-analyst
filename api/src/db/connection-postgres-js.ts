/**
 * PostgreSQL Connection using `postgres` (postgres.js) library
 *
 * Modern PostgreSQL driver with a simpler API
 * GitHub: https://github.com/porsager/postgres
 * Docs: https://postgres.js.org/
 */

import postgres from 'postgres';

export interface PostgresConfig {
  host?: string;
  port?: number;
  database: string;
  user: string;
  password: string;
  ssl?: boolean;
}

export class PostgresJsConnection {
  private sql: postgres.Sql<{}> | null = null;

  /**
   * Create a connection from connection string
   * Example: postgresql://user:password@host:port/database
   */
  static fromConnectionString(connectionString: string): PostgresJsConnection {
    return new PostgresJsConnection(connectionString);
  }

  constructor(private connectionString: string) {}

  /**
   * Connect to the database (postgres.js connects lazily on first query)
   */
  async connect(): Promise<void> {
    this.sql = postgres(this.connectionString, {
      max: 10,
      idle_timeout: 30,
      connect_timeout: 10,
    });

    // Test connection with a simple query
    await this.sql`SELECT 1`;
    console.log('[postgres.js] Connected successfully!');
  }

  /**
   * Execute a query
   */
  async query<T = any>(sql: string, params?: any[]): Promise<T[]> {
    if (!this.sql) {
      throw new Error('Not connected. Call connect() first.');
    }

    const start = Date.now();
    const result = await this.sql.unsafe(sql, params);
    const duration = Date.now() - start;

    console.log(`[postgres.js] Query executed in ${duration}ms`);
    return result as T[];
  }

  /**
   * Execute a query with full result metadata
   */
  async queryWithMeta(sql: string, params?: any[]) {
    if (!this.sql) {
      throw new Error('Not connected. Call connect() first.');
    }

    const start = Date.now();
    const result = await this.sql.unsafe(sql, params);
    const duration = Date.now() - start;

    // Get column names from first row
    const columns = result.length > 0 ? Object.keys(result[0]) : [];

    return {
      rows: result,
      columns,
      rowCount: result.length,
      executionTime: duration,
    };
  }

  /**
   * Get table schema
   */
  async getTableSchema(tableName: string): Promise<any[]> {
    if (!this.sql) {
      throw new Error('Not connected. Call connect() first.');
    }

    const result = await this.sql`
      SELECT
        column_name,
        data_type,
        is_nullable,
        column_default,
        character_maximum_length
      FROM information_schema.columns
      WHERE table_name = ${tableName}
      ORDER BY ordinal_position
    `;
    return result;
  }

  /**
   * List all tables
   */
  async listTables(): Promise<any[]> {
    if (!this.sql) {
      throw new Error('Not connected. Call connect() first.');
    }

    const result = await this.sql`
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
    return result;
  }

  /**
   * Close the connection
   */
  async close(): Promise<void> {
    if (this.sql) {
      await this.sql.end();
      this.sql = null;
      console.log('[postgres.js] Connection closed.');
    }
  }

  /**
   * Get the underlying sql instance (for advanced use)
   */
  getSql(): postgres.Sql<{}> | null {
    return this.sql;
  }
}

// Export singleton instance creator
export async function createPostgresJsConnection(connectionString: string): Promise<PostgresJsConnection> {
  const conn = PostgresJsConnection.fromConnectionString(connectionString);
  await conn.connect();
  return conn;
}
