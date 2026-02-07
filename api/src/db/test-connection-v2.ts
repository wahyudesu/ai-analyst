/**
 * Test database connection
 *
 * Usage:
 *   pnpm run test:db
 *   node dist/db/test-connection-v2.js
 */

async function testConnection() {
  console.log('🔍 Testing database connection...\n');

  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    console.error('❌ DATABASE_URL environment variable is not set');
    process.exit(1);
  }

  // Sanitize for logging (hide password)
  const sanitized = connectionString.replace(/:[^:]+@/, ':****@');
  console.log(`Connection string: ${sanitized}\n`);

  const { connectionManager } = await import('./connection-manager-v2.js');

  const result = await connectionManager.getConnection(connectionString);

  if (!result.success) {
    console.error(`❌ Connection failed:\n${result.error}`);
    process.exit(1);
  }

  console.log('✅ Connection successful!');

  // Test a simple query
  try {
    const testResult = await result.pool.query('SELECT version()');
    console.log(`\nDatabase version: ${testResult.rows[0].version}`);
  } catch (err) {
    console.error('Query failed:', err);
  }

  // Get stats
  const stats = connectionManager.getStats();
  console.log(`\n📊 Connection stats:`, stats);

  // Close connection
  await connectionManager.closeAll();
  console.log('\n✅ Connection closed');
}

testConnection().catch(console.error);
