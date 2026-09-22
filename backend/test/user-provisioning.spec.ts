import 'reflect-metadata';
import { UnauthorizedException } from '@nestjs/common';
import {
  PostgreSqlContainer,
  type StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from 'vitest';
import { AuthService } from '../src/identity/application/auth.service';
import type { VerifiedToken } from '../src/identity/application/token-verifier';
import { User } from '../src/identity/domain/user';
import { DrizzleUserRepository } from '../src/identity/infrastructure/drizzle-user-repository';
import { closeDb, createDb, type Db } from '../src/shared/db/client';
import { runMigrations } from '../src/shared/db/migrate';
import { asUuid } from '../src/shared/domain/uuid';
import { FakeUserRepository } from './fakes';

const SUB = asUuid('67bacbe7-c2d2-4922-b506-582df6956f66');

class FixedClock {
  constructor(public value: Date) {}
  now(): Date {
    return this.value;
  }
}

function token(over: Partial<VerifiedToken> = {}): VerifiedToken {
  return { subject: SUB, email: 'dev@example.com', name: 'Dev User', ...over };
}

describe('AuthService.resolveUser', () => {
  let users: FakeUserRepository;
  let clock: FixedClock;
  let auth: AuthService;

  beforeEach(() => {
    users = new FakeUserRepository();
    clock = new FixedClock(new Date('2026-09-07T10:00:00.000Z'));
    auth = new AuthService(users, clock);
  });

  it('provisions a new projection row and returns id = sub', async () => {
    const id = await auth.resolveUser(token());

    expect(id).toBe(SUB);
    const stored = await users.byId(SUB);
    expect(stored?.email.value).toBe('dev@example.com');
    expect(stored?.displayName).toBe('Dev User');
    expect(stored?.createdAt).toEqual(new Date('2026-09-07T10:00:00.000Z'));
  });

  it('keeps first-seen but refreshes email and name on the next call', async () => {
    await auth.resolveUser(token());

    clock.value = new Date('2026-12-01T00:00:00.000Z');
    await auth.resolveUser(
      token({ email: 'dev.renamed@example.com', name: 'Renamed Dev' }),
    );

    const stored = await users.byId(SUB);
    expect(stored?.email.value).toBe('dev.renamed@example.com');
    expect(stored?.displayName).toBe('Renamed Dev');
    expect(stored?.createdAt).toEqual(new Date('2026-09-07T10:00:00.000Z'));
  });

  it('rejects a token with no email claim', async () => {
    await expect(auth.resolveUser(token({ email: undefined }))).rejects.toThrow(
      UnauthorizedException,
    );
  });
});

describe('DrizzleUserRepository', () => {
  let container: StartedPostgreSqlContainer;
  let db: Db;
  let repo: DrizzleUserRepository;

  beforeAll(async () => {
    container = await new PostgreSqlContainer('postgres:17-alpine').start();
    db = createDb(container.getConnectionUri());
    await runMigrations(db); // 0000..0003
    repo = new DrizzleUserRepository(db);
  }, 120_000);

  afterAll(async () => {
    await closeDb(db);
    await container?.stop();
  });

  it('upserts a projection: insert, then update email/name, keeping createdAt', async () => {
    await repo.save(
      User.fromKeycloak(
        SUB,
        'dev@example.com',
        'Dev User',
        new Date('2026-09-07T10:00:00.000Z'),
      ),
    );

    const inserted = await repo.byId(SUB);
    expect(inserted?.email.value).toBe('dev@example.com');
    expect(inserted?.displayName).toBe('Dev User');

    await repo.save(
      User.fromKeycloak(
        SUB,
        'new@example.com',
        'New Name',
        new Date('2027-01-01T00:00:00.000Z'), // ignored on conflict
      ),
    );

    const updated = await repo.byId(SUB);
    expect(updated?.email.value).toBe('new@example.com');
    expect(updated?.displayName).toBe('New Name');
    expect(updated?.createdAt).toEqual(new Date('2026-09-07T10:00:00.000Z'));
  });
});
