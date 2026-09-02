import { join } from 'node:path';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import type { Db } from './client';

// `drizzle/` sits at the backend root — three levels up from both
// `src/shared/db/` and `dist/shared/db/`.
const MIGRATIONS_FOLDER = join(__dirname, '..', '..', '..', 'drizzle');

/** Apply any pending SQL migrations. Runs on API start and via `pnpm db:migrate`. */
export function runMigrations(db: Db): Promise<void> {
  return migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
}
