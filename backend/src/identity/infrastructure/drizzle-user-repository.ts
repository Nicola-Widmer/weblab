import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import type { Db } from '../../shared/db/client';
import { DB } from '../../shared/db/database.module';
import {
  users as usersTable,
  type NewUserRow,
  type UserRow,
} from '../../shared/db/schema';
import { asUuid, type Uuid } from '../../shared/domain/uuid';
import { UserRepository } from '../application/user-repository';
import { Email } from '../domain/email';
import { User } from '../domain/user';

/**
 * Drizzle / PostgreSQL adapter for `UserRepository` (ADR-0004). The row is a
 * projection of the Keycloak user (id = `sub`); `save` upserts it, refreshing
 * `email` / `display_name` but never touching `created_at` (first seen).
 */
@Injectable()
export class DrizzleUserRepository extends UserRepository {
  constructor(@Inject(DB) private readonly db: Db) {
    super();
  }

  async save(user: User): Promise<void> {
    const row = toRow(user);
    await this.db
      .insert(usersTable)
      .values(row)
      .onConflictDoUpdate({
        target: usersTable.id,
        set: { email: row.email, displayName: row.displayName },
      });
  }

  async byId(id: Uuid): Promise<User | undefined> {
    const [row] = await this.db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, id));
    return row ? toDomain(row) : undefined;
  }
}

function toRow(user: User): NewUserRow {
  return {
    id: user.id,
    email: user.email.value,
    displayName: user.displayName ?? null,
    createdAt: user.createdAt,
  };
}

function toDomain(row: UserRow): User {
  return new User(
    asUuid(row.id),
    Email.of(row.email),
    row.createdAt,
    row.displayName ?? undefined,
  );
}
