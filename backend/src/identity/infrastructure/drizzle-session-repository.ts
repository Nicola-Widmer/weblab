import { Inject, Injectable } from '@nestjs/common';
import { eq, lt } from 'drizzle-orm';
import type { Db } from '../../shared/db/client';
import { DB } from '../../shared/db/database.module';
import {
  sessions as sessionsTable,
  type NewSessionRow,
  type SessionRow,
} from '../../shared/db/schema';
import { asUuid, type Uuid } from '../../shared/domain/uuid';
import { SessionRepository } from '../application/session-repository';
import { Session } from '../domain/session';

/**
 * Drizzle / PostgreSQL adapter for `SessionRepository` (ADR-0004). `save`
 * upserts by `id`; a refresh only rewrites the token columns.
 */
@Injectable()
export class DrizzleSessionRepository extends SessionRepository {
  constructor(@Inject(DB) private readonly db: Db) {
    super();
  }

  async save(session: Session): Promise<void> {
    const row = toRow(session);
    await this.db
      .insert(sessionsTable)
      .values(row)
      .onConflictDoUpdate({
        target: sessionsTable.id,
        set: {
          accessToken: row.accessToken,
          refreshToken: row.refreshToken,
          accessTokenExpiresAt: row.accessTokenExpiresAt,
        },
      });
  }

  async byId(id: Uuid): Promise<Session | undefined> {
    const [row] = await this.db
      .select()
      .from(sessionsTable)
      .where(eq(sessionsTable.id, id));
    return row ? toDomain(row) : undefined;
  }

  async deleteById(id: Uuid): Promise<void> {
    await this.db.delete(sessionsTable).where(eq(sessionsTable.id, id));
  }

  async deleteExpired(now: Date): Promise<void> {
    await this.db.delete(sessionsTable).where(lt(sessionsTable.expiresAt, now));
  }
}

function toRow(s: Session): NewSessionRow {
  return {
    id: s.id,
    userId: s.userId,
    createdAt: s.createdAt,
    expiresAt: s.expiresAt,
    accessToken: s.accessToken,
    refreshToken: s.refreshToken,
    accessTokenExpiresAt: s.accessTokenExpiresAt,
  };
}

function toDomain(r: SessionRow): Session {
  return new Session(
    asUuid(r.id),
    asUuid(r.userId),
    r.createdAt,
    r.expiresAt,
    r.accessToken,
    r.refreshToken,
    r.accessTokenExpiresAt,
  );
}
