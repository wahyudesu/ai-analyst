/**
 * Tests for PostgresJsConnection (postgres.js)
 *
 * TDD Approach:
 * 1. Write failing test (RED)
 * 2. Verify test fails correctly
 * 3. Implement minimal code to pass (GREEN)
 * 4. Verify test passes
 * 5. Refactor
 *
 * Run: pnpm test connection-postgres-js
 * Skip DB connection: SKIP_DB_TESTS=true pnpm test connection-postgres-js
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PostgresJsConnection, PostgresConfig } from '../connection-postgres-js.js';

// Mock console methods to avoid noise in tests
const originalConsole = {
  log: console.log,
  error: console.error,
  warn: console.warn,
};

describe('PostgresJsConnection', () => {
  beforeEach(() => {
    // Suppress console output during tests
    console.log = vi.fn();
    console.error = vi.fn();
    console.warn = vi.fn();
  });

  afterEach(() => {
    // Restore console
    console.log = originalConsole.log;
    console.error = originalConsole.error;
    console.warn = originalConsole.warn;
  });

  describe('fromConnectionString', () => {
    it('should create instance from connection string', () => {
      const connectionString = 'postgresql://user:password@localhost:5432/mydb';
      const connection = PostgresJsConnection.fromConnectionString(connectionString);

      expect(connection).toBeInstanceOf(PostgresJsConnection);
    });

    it('should store connection string internally', () => {
      const connectionString = 'postgresql://user:password@localhost:5432/mydb';
      const connection = PostgresJsConnection.fromConnectionString(connectionString);

      expect((connection as any).connectionString).toBe(connectionString);
    });
  });

  describe('constructor', () => {
    it('should create instance with connection string', () => {
      const connectionString = 'postgresql://user:password@localhost:5432/mydb';
      const connection = new PostgresJsConnection(connectionString);

      expect(connection).toBeInstanceOf(PostgresJsConnection);
    });

    it('should store connection string', () => {
      const connectionString = 'postgresql://user:password@localhost:5432/mydb';
      const connection = new PostgresJsConnection(connectionString);

      expect((connection as any).connectionString).toBe(connectionString);
    });
  });

  describe('query', () => {
    it('should throw error when not connected', async () => {
      const connection = new PostgresJsConnection('postgresql://user:pass@localhost/db');

      await expect(connection.query('SELECT 1')).rejects.toThrow('Not connected');
    });

    it('should throw error with specific message', async () => {
      const connection = new PostgresJsConnection('postgresql://user:pass@localhost/db');

      await expect(connection.query('SELECT 1')).rejects.toThrow('Call connect() first');
    });
  });

  describe('queryWithMeta', () => {
    it('should throw error when not connected', async () => {
      const connection = new PostgresJsConnection('postgresql://user:pass@localhost/db');

      await expect(connection.queryWithMeta('SELECT 1')).rejects.toThrow('Not connected');
    });
  });

  describe('getTableSchema', () => {
    it('should throw error when not connected', async () => {
      const connection = new PostgresJsConnection('postgresql://user:pass@localhost/db');

      await expect(connection.getTableSchema('users')).rejects.toThrow('Not connected');
    });
  });

  describe('listTables', () => {
    it('should throw error when not connected', async () => {
      const connection = new PostgresJsConnection('postgresql://user:pass@localhost/db');

      await expect(connection.listTables()).rejects.toThrow('Not connected');
    });
  });

  describe('getSql', () => {
    it('should return null when not connected', () => {
      const connection = new PostgresJsConnection('postgresql://user:pass@localhost/db');
      const sql = connection.getSql();

      expect(sql).toBeNull();
    });
  });

  describe('close', () => {
    it('should handle closing when not connected gracefully', async () => {
      const connection = new PostgresJsConnection('postgresql://user:pass@localhost/db');
      await expect(connection.close()).resolves.not.toThrow();
    });
  });
});

describe('PostgresJsConnection Integration Tests', () => {
  const SKIP_DB_TESTS = process.env.SKIP_DB_TESTS === 'true';
  const TEST_CONNECTION_STRING = process.env.DATABASE_URL || '';

  beforeEach(() => {
    console.log = vi.fn();
    console.error = vi.fn();
    console.warn = vi.fn();
  });

  afterEach(() => {
    console.log = originalConsole.log;
    console.error = originalConsole.error;
    console.warn = originalConsole.warn;
  });

  describe.skipIf(SKIP_DB_TESTS)('real database connection', () => {
    let connection: PostgresJsConnection;

    it('should require DATABASE_URL for integration tests', () => {
      if (!TEST_CONNECTION_STRING) {
        throw new Error('DATABASE_URL environment variable is required for integration tests');
      }
    });

    it('should connect to real database', async () => {
      connection = PostgresJsConnection.fromConnectionString(TEST_CONNECTION_STRING);
      await expect(connection.connect()).resolves.not.toThrow();
    });

    it('should execute simple query', async () => {
      if (!connection) {
        connection = PostgresJsConnection.fromConnectionString(TEST_CONNECTION_STRING);
        await connection.connect();
      }

      const result = await connection.query<{ result: number }>('SELECT 1 as result');
      expect(result).toHaveLength(1);
      expect(result[0].result).toBe(1);
    });

    it('should execute query with metadata', async () => {
      if (!connection) {
        connection = PostgresJsConnection.fromConnectionString(TEST_CONNECTION_STRING);
        await connection.connect();
      }

      const result = await connection.queryWithMeta('SELECT 1 as value, 2 as another');

      expect(result.rows).toHaveLength(1);
      expect(result.columns).toContain('value');
      expect(result.columns).toContain('another');
      expect(result.rowCount).toBe(1);
      expect(result.executionTime).toBeGreaterThanOrEqual(0);
    });

    it('should list tables', async () => {
      if (!connection) {
        connection = PostgresJsConnection.fromConnectionString(TEST_CONNECTION_STRING);
        await connection.connect();
      }

      const tables = await connection.listTables();
      expect(Array.isArray(tables)).toBe(true);
    });

    it('should get table schema', async () => {
      if (!connection) {
        connection = PostgresJsConnection.fromConnectionString(TEST_CONNECTION_STRING);
        await connection.connect();
      }

      // Try to get schema for a common table that might exist
      const schema = await connection.getTableSchema('information_schema.tables');
      expect(Array.isArray(schema)).toBe(true);
    });

    it('should get sql instance after connection', async () => {
      if (!connection) {
        connection = PostgresJsConnection.fromConnectionString(TEST_CONNECTION_STRING);
        await connection.connect();
      }

      const sql = connection.getSql();
      expect(sql).not.toBeNull();
    });

    it('should close connection', async () => {
      if (!connection) {
        connection = PostgresJsConnection.fromConnectionString(TEST_CONNECTION_STRING);
        await connection.connect();
      }

      await expect(connection.close()).resolves.not.toThrow();

      // Sql should be null after close
      const sql = connection.getSql();
      expect(sql).toBeNull();
    });
  });
});

describe('createPostgresJsConnection factory function', () => {
  it('should be exported from module', async () => {
    const { createPostgresJsConnection } = await import('../connection-postgres-js.js');
    expect(typeof createPostgresJsConnection).toBe('function');
  });
});
