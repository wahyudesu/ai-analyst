/**
 * Test script for comparing `pg` and `postgres.js` libraries
 *
 * Usage:
 *   npx tsx src/db/test-connection.ts <connection_string>
 *
 * Example:
 *   npx tsx src/db/test-connection.ts "postgresql://user:password@localhost:5432/mydb"
 */

import { PgConnection, PostgresJsConnection } from './index.js';

const CONNECTION_STRING = process.env.DATABASE_URL || process.argv[2];

if (!CONNECTION_STRING) {
  console.error('Please provide a connection string:');
  console.error('  npx tsx src/db/test-connection.ts "postgresql://user:password@host:port/database"');
  console.error('  Or set DATABASE_URL environment variable');
  process.exit(1);
}

async function testPg() {
  console.log('\n========================================');
  console.log('Testing `pg` (node-postgres) library');
  console.log('========================================\n');

  const conn = PgConnection.fromConnectionString(CONNECTION_STRING);

  try {
    await conn.connect();

    // Test 1: Simple query
    console.log('\n--- Test 1: Simple Query ---');
    const version = await conn.query<{ version: string }>('SELECT version()');
    console.log('PostgreSQL version:', version[0]?.version?.substring(0, 50) + '...');

    // Test 2: Current timestamp
    console.log('\n--- Test 2: Current Timestamp ---');
    const time = await conn.query<{ now: string }>('SELECT NOW() as now');
    console.log('Current time:', time[0]?.now);

    // Test 3: List tables
    console.log('\n--- Test 3: List Tables ---');
    const tables = await conn.listTables();
    console.log(`Found ${tables.length} tables:`);
    tables.slice(0, 10).forEach((t) => {
      console.log(`  - ${t.table_schema}.${t.table_name} (${t.column_count} columns)`);
    });
    if (tables.length > 10) {
      console.log(`  ... and ${tables.length - 10} more`);
    }

    // Test 4: Query with metadata
    console.log('\n--- Test 4: Query with Metadata ---');
    const result = await conn.queryWithMeta('SELECT * FROM pg_stat_activity WHERE pid = pg_backend_pid()');
    console.log('Metadata:', {
      columns: result.columns,
      rowCount: result.rowCount,
      executionTime: `${result.executionTime}ms`,
    });

    console.log('\n✅ `pg` library - All tests passed!\n');

  } catch (error) {
    console.error('\n❌ `pg` library - Error:', error);
    throw error;
  } finally {
    await conn.close();
  }
}

async function testPostgresJs() {
  console.log('\n========================================');
  console.log('Testing `postgres` (postgres.js) library');
  console.log('========================================\n');

  const conn = PostgresJsConnection.fromConnectionString(CONNECTION_STRING);

  try {
    await conn.connect();

    // Test 1: Simple query
    console.log('\n--- Test 1: Simple Query ---');
    const version = await conn.query<{ version: string }>('SELECT version()');
    console.log('PostgreSQL version:', version[0]?.version?.substring(0, 50) + '...');

    // Test 2: Current timestamp
    console.log('\n--- Test 2: Current Timestamp ---');
    const time = await conn.query<{ now: string }>('SELECT NOW() as now');
    console.log('Current time:', time[0]?.now);

    // Test 3: List tables
    console.log('\n--- Test 3: List Tables ---');
    const tables = await conn.listTables();
    console.log(`Found ${tables.length} tables:`);
    tables.slice(0, 10).forEach((t) => {
      console.log(`  - ${t.table_schema}.${t.table_name} (${t.column_count} columns)`);
    });
    if (tables.length > 10) {
      console.log(`  ... and ${tables.length - 10} more`);
    }

    // Test 4: Query with metadata
    console.log('\n--- Test 4: Query with Metadata ---');
    const result = await conn.queryWithMeta('SELECT * FROM pg_stat_activity WHERE pid = pg_backend_pid()');
    console.log('Metadata:', {
      columns: result.columns,
      rowCount: result.rowCount,
      executionTime: `${result.executionTime}ms`,
    });

    // Test 5: Template literal query (postgres.js feature)
    console.log('\n--- Test 5: Template Literal Query (postgres.js feature) ---');
    const sql = conn.getSql();
    if (sql) {
      const tableName = 'pg_stat_activity';
      const result2 = await sql`SELECT COUNT(*) as count FROM ${sql(tableName)}`;
      console.log('Count from pg_stat_activity:', result2[0]?.count);
    }

    console.log('\n✅ `postgres.js` library - All tests passed!\n');

  } catch (error) {
    console.error('\n❌ `postgres.js` library - Error:', error);
    throw error;
  } finally {
    await conn.close();
  }
}

async function main() {
  console.log('\╔════════════════════════════════════════════════╗');
  console.log('║  PostgreSQL Connection Library Comparison Test ║');
  console.log('╚════════════════════════════════════════════════╝');

  try {
    await testPg();
    await testPostgresJs();

    console.log('\n╔════════════════════════════════════════════════╗');
    console.log('║       All libraries tested successfully! 🎉    ║');
    console.log('╚════════════════════════════════════════════════╝\n');

  } catch (error) {
    console.error('\nTest failed. Please check your connection string and try again.\n');
    process.exit(1);
  }
}

main();
