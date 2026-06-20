/**
 * db/index.ts
 * Drizzle ORM connection to Supabase PostgreSQL.
 * Uses the `postgres` driver (pg-wire protocol, not pg).
 *
 * NOTE: Connection is lazy — the server starts even without DATABASE_URL.
 * Routes that use db() will throw a clear error at request-time if not set.
 */

import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema.js';

let _db: PostgresJsDatabase<typeof schema> | null = null;

function getDb(): PostgresJsDatabase<typeof schema> {
  if (_db) return _db;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      '❌ DATABASE_URL is not set. Add your Supabase connection string to backend/.env'
    );
  }

  const client = postgres(connectionString, {
    max: 10,
    idle_timeout: 30,
    connect_timeout: 10,
    ssl: connectionString.includes('supabase') ? 'require' : false,
  });

  _db = drizzle(client, { schema });
  return _db;
}

// Proxy object — initializes on first use
const db = new Proxy({} as PostgresJsDatabase<typeof schema>, {
  get(_target, prop) {
    return (getDb() as any)[prop];
  },
});

export { schema };
export default db;
