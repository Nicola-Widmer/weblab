import {
  Global,
  Inject,
  Module,
  type OnApplicationShutdown,
} from '@nestjs/common';
import { closeDb, createDb, type Db } from './client';

/** DI token for the Drizzle handle. `null` when `DATABASE_URL` is unset. */
export const DB = Symbol('DB');

/**
 * Provides the Postgres connection app-wide. Only the `songs` context uses it so
 * far; when `DATABASE_URL` is absent (tests, `pnpm openapi`) the provider is
 * `null` and `songs.module.ts` falls back to the in-memory repository.
 */
@Global()
@Module({
  providers: [
    {
      provide: DB,
      useFactory: (): Db | null => {
        const url = process.env.DATABASE_URL;
        return url ? createDb(url) : null;
      },
    },
  ],
  exports: [DB],
})
export class DatabaseModule implements OnApplicationShutdown {
  constructor(@Inject(DB) private readonly db: Db | null) {}

  async onApplicationShutdown(): Promise<void> {
    if (this.db) await closeDb(this.db);
  }
}
