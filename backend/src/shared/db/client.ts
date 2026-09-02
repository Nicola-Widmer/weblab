import { type NodePgDatabase, drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { schema } from './schema';

/** The Drizzle handle, schema-aware. Injected via the `DB` token. */
export type Db = NodePgDatabase<typeof schema> & { $client: Pool };

export function createDb(url: string): Db {
  const pool = new Pool({ connectionString: url });
  return drizzle(pool, { schema }) as Db;
}

export async function closeDb(db: Db): Promise<void> {
  await db.$client.end();
}
