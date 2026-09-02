import { defineConfig } from 'drizzle-kit';

// `pnpm db:generate` diffs schema.ts against drizzle/ and writes SQL (no DB
// needed). `pnpm db:migrate` applies pending migrations to DATABASE_URL.
export default defineConfig({
  dialect: 'postgresql',
  schema: './src/shared/db/schema.ts',
  out: './drizzle',
  casing: 'snake_case',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? 'postgres://wmp:wmp@localhost:5432/wmp',
  },
});
