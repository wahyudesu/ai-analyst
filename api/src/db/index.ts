/**
 * Database connection exports
 *
 * Exports both `pg` and `postgres.js` connection classes
 */

export { PgConnection, createPgConnection, createPgConnectionFromUrl } from './connection-pg.js';
export { PostgresJsConnection, createPostgresJsConnection } from './connection-postgres-js.js';

// Re-export types
export type { PostgresConfig } from './connection-pg.js';
