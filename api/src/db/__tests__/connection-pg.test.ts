/**
 * Tests for PgConnection (node-postgres)
 *
 * TDD Approach:
 * 1. Write failing test (RED)
 * 2. Verify test fails correctly
 * 3. Implement minimal code to pass (GREEN)
 * 4. Verify test passes
 * 5. Refactor
 *
 * Run: pnpm test connection-pg
 * Skip DB connection: SKIP_DB_TESTS=true pnpm test connection-pg
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PgConnection, PostgresConfig } from '../connection-pg.js';

// Mock console methods to avoid noise in tests
const originalConsole = {
  log: console.log,
  error: console.error,
  warn: console.warn,
};

describe('PgConnection', () => {
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

  describe('PostgresConfig type', () => {
    it('should accept minimal config with required fields', () => {
      const config: PostgresConfig = {
        database: 'testdb',
        user: 'testuser',
        password: 'testpass',
      };

      expect(config.database).toBe('testdb');
      expect(config.user).toBe('testuser');
      expect(config.password).toBe('testpass');
    });

    it('should accept config with optional fields', () => {
      const config: PostgresConfig = {
        host: 'localhost',
        port: 5432,
        database: 'testdb',
        user: 'testuser',
        password: 'testpass',
        ssl: true,
      };

      expect(config.host).toBe('localhost');
      expect(config.port).toBe(5432);
      expect(config.ssl).toBe(true);
    });
  });

  describe('fromConnectionString', () => {
    it('should parse connection string with all components', () => {
      const connectionString = 'postgresql://user:password@localhost:5432/mydb?sslmode=require';
      const connection = PgConnection.fromConnectionString(connectionString);

      expect(connection).toBeInstanceOf(PgConnection);
    });

    it('should parse connection string without port', () => {
      const connectionString = 'postgresql://user:password@localhost/mydb';
      const connection = PgConnection.fromConnectionString(connectionString);

      expect(connection).toBeInstanceOf(PgConnection);
    });

    it('should parse connection string without sslmode', () => {
      const connectionString = 'postgresql://user:password@localhost:5432/mydb';
      const connection = PgConnection.fromConnectionString(connectionString);

      expect(connection).toBeInstanceOf(PgConnection);
    });

    it('should handle postgres:// prefix', () => {
      const connectionString = 'postgres://user:password@localhost:5432/mydb';
      const connection = PgConnection.fromConnectionString(connectionString);

      expect(connection).toBeInstanceOf(PgConnection);
    });

    it('should parse database name from pathname', () => {
      const connectionString = 'postgresql://user:password@localhost:5432/mydb';
      const connection = PgConnection.fromConnectionString(connectionString);

      expect(connection).toBeInstanceOf(PgConnection);
    });
  });

  describe('constructor', () => {
    it('should create instance with config object', () => {
      const config: PostgresConfig = {
        database: 'testdb',
        user: 'testuser',
        password: 'testpass',
      };

      const connection = new PgConnection(config);
      expect(connection).toBeInstanceOf(PgConnection);
    });

    it('should store config internally', () => {
      const config: PostgresConfig = {
        database: 'testdb',
        user: 'testuser',
        password: 'testpass',
      };

      const connection = new PgConnection(config);
      // Config should be stored (accessed via private property in tests)
      expect((connection as any).config).toEqual(config);
    });
  });

  describe('query', () => {
    it('should throw error when not connected', async () => {
      const config: PostgresConfig = {
        database: 'testdb',
        user: 'testuser',
        password: 'testpass',
      };

      const connection = new PgConnection(config);

      await expect(connection.query('SELECT 1')).rejects.toThrow('Not connected');
    });

    it('should throw error with specific message', async () => {
      const config: PostgresConfig = {
        database: 'testdb',
        user: 'testuser',
        password: 'testpass',
      };

      const connection = new PgConnection(config);

      await expect(connection.query('SELECT 1')).rejects.toThrow('Call connect() first');
    });
  });

  describe('queryWithMeta', () => {
    it('should throw error when not connected', async () => {
      const config: PostgresConfig = {
        database: 'testdb',
        user: 'testuser',
        password: 'testpass',
      };

      const connection = new PgConnection(config);

      await expect(connection.queryWithMeta('SELECT 1')).rejects.toThrow('Not connected');
    });
  });

  describe('getTableSchema', () => {
    it('should throw error when not connected', async () => {
      const config: PostgresConfig = {
        database: 'testdb',
        user: 'testuser',
        password: 'testpass',
      };

      const connection = new PgConnection(config);

      await expect(connection.getTableSchema('users')).rejects.toThrow('Not connected');
    });
  });

  describe('listTables', () => {
    it('should throw error when not connected', async () => {
      const config: PostgresConfig = {
        database: 'testdb',
        user: 'testuser',
        password: 'testpass',
      };

      const connection = new PgConnection(config);

      await expect(connection.listTables()).rejects.toThrow('Not connected');
    });
  });

  describe('getPool', () => {
    it('should return null when not connected', () => {
      const config: PostgresConfig = {
        database: 'testdb',
        user: 'testuser',
        password: 'testpass',
      };

      const connection = new PgConnection(config);
      const pool = connection.getPool();

      expect(pool).toBeNull();
    });
  });

  describe('close', () => {
    it('should handle closing when not connected gracefully', async () => {
      const config: PostgresConfig = {
        database: 'testdb',
        user: 'testuser',
        password: 'testpass',
      };

      const connection = new PgConnection(config);
      await expect(connection.close()).resolves.not.toThrow();
    });
  });
});

describe('PgConnection Integration Tests', () => {
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
    let connection: PgConnection;

    it('should require DATABASE_URL for integration tests', () => {
      if (!TEST_CONNECTION_STRING) {
        throw new Error('DATABASE_URL environment variable is required for integration tests');
      }
    });

    it('should connect to real database', async () => {
      connection = PgConnection.fromConnectionString(TEST_CONNECTION_STRING);
      await expect(connection.connect()).resolves.not.toThrow();
    });

    it('should execute simple query', async () => {
      if (!connection) {
        connection = PgConnection.fromConnectionString(TEST_CONNECTION_STRING);
        await connection.connect();
      }

      const result = await connection.query<{ result: number }>('SELECT 1 as result');
      expect(result).toHaveLength(1);
      expect(result[0].result).toBe(1);
    });

    it('should execute query with metadata', async () => {
      if (!connection) {
        connection = PgConnection.fromConnectionString(TEST_CONNECTION_STRING);
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
        connection = PgConnection.fromConnectionString(TEST_CONNECTION_STRING);
        await connection.connect();
      }

      const tables = await connection.listTables();
      expect(Array.isArray(tables)).toBe(true);
    });

    it('should get pool after connection', async () => {
      if (!connection) {
        connection = PgConnection.fromConnectionString(TEST_CONNECTION_STRING);
        await connection.connect();
      }

      const pool = connection.getPool();
      expect(pool).not.toBeNull();
    });

    it('should close connection', async () => {
      if (!connection) {
        connection = PgConnection.fromConnectionString(TEST_CONNECTION_STRING);
        await connection.connect();
      }

      await expect(connection.close()).resolves.not.toThrow();

      // Pool should be null after close
      const pool = connection.getPool();
      expect(pool).toBeNull();
    });
  });

  describe('connection string parsing', () => {
    it('should parse Neon connection string', () => {
      const neonUrl =
        'postgresql://neondb_owner:npg_lqdYNJuIO08a@ep-proud-mouse-aijyu7tu-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require';

      const connection = PgConnection.fromConnectionString(neonUrl);
      expect(connection).toBeInstanceOf(PgConnection);

      const config = (connection as any).config;
      expect(config.host).toBe('ep-proud-mouse-aijyu7tu-pooler.c-4.us-east-1.aws.neon.tech');
      expect(config.port).toBe(5432);
      expect(config.database).toBe('neondb');
      expect(config.user).toBe('neondb_owner');
      expect(config.password).toBe('npg_lqdYNJuIO08a');
      expect(config.ssl).toBe(true);
    });

    it('should parse Supabase connection string', () => {
      const supabaseUrl =
        'postgresql://postgres:password@db.project.supabase.co:5432/postgres?sslmode=require';

      const connection = PgConnection.fromConnectionString(supabaseUrl);
      expect(connection).toBeInstanceOf(PgConnection);

      const config = (connection as any).config;
      expect(config.host).toBe('db.project.supabase.co');
      expect(config.database).toBe('postgres');
      expect(config.ssl).toBe(true);
    });
  });
});
