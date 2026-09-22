import 'reflect-metadata';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import {
  PostgreSqlContainer,
  type StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import { eq } from 'drizzle-orm';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { OidcClient } from '../src/identity/application/oidc-client';
import { SessionRepository } from '../src/identity/application/session-repository';
import { TokenVerifier } from '../src/identity/application/token-verifier';
import { Session } from '../src/identity/domain/session';
import type { Db } from '../src/shared/db/client';
import { closeDb, createDb } from '../src/shared/db/client';
import { DB } from '../src/shared/db/database.module';
import { runMigrations } from '../src/shared/db/migrate';
import {
  sessions as sessionsTable,
  users as usersTable,
} from '../src/shared/db/schema';
import { asUuid } from '../src/shared/domain/uuid';

// The `identity` repositories are Postgres-only, so this runs on a real
// container. `AUTH_ENABLED=false` and the full OIDC/cookie flow (a fake Keycloak
// via `OidcClient` / `TokenVerifier`) are two app instances sharing the DB.

const SUB = asUuid('67bacbe7-c2d2-4922-b506-582df6956f66');

const fakeOidc = {
  authorizeUrl: ({ state, register }: { state: string; register?: boolean }) =>
    `https://kc.example/realms/wmp/protocol/openid-connect/${
      register ? 'registrations' : 'auth'
    }?state=${state}`,
  exchangeCode: vi.fn(async () => ({
    accessToken: 'access-1',
    refreshToken: 'refresh-1',
    expiresInSeconds: 300,
  })),
  refresh: vi.fn(async () => ({
    accessToken: 'access-2',
    refreshToken: 'refresh-2',
    expiresInSeconds: 300,
  })),
  endSession: vi.fn(async () => undefined),
};

const fakeVerifier = {
  verify: vi.fn(async () => ({
    subject: SUB,
    email: 'dev@example.com',
    name: 'Dev User',
  })),
};

let container: StartedPostgreSqlContainer;
let db: Db;

/** Pull one cookie's `name=value` (no attributes) out of a Set-Cookie header. */
function cookie(res: request.Response, name: string): string {
  const raw = res.headers['set-cookie'] as unknown as string[] | undefined;
  const hit = (raw ?? []).find((c) => c.startsWith(`${name}=`));
  if (!hit) throw new Error(`no ${name} cookie in response`);
  return hit.split(';')[0];
}

async function buildApp(
  overrideOidc: boolean,
): Promise<INestApplication> {
  const { AppModule } = await import('../src/app.module');
  let builder = Test.createTestingModule({ imports: [AppModule] });
  if (overrideOidc) {
    builder = builder
      .overrideProvider(OidcClient)
      .useValue(fakeOidc)
      .overrideProvider(TokenVerifier)
      .useValue(fakeVerifier);
  }
  const app = (await builder.compile()).createNestApplication();
  const { configureApp } = await import('../src/setup');
  configureApp(app);
  await app.init();
  return app;
}

beforeAll(async () => {
  container = await new PostgreSqlContainer('postgres:17-alpine').start();
  process.env.DATABASE_URL = container.getConnectionUri();
  process.env.OIDC_ISSUER_URL = 'https://kc.example/realms/wmp';
  process.env.OIDC_INTERNAL_URL = 'https://kc.example/realms/wmp';
  process.env.OIDC_CLIENT_ID = 'wmp-api';
  process.env.OIDC_CLIENT_SECRET = 'test-secret';
  process.env.OIDC_REDIRECT_URI = 'https://app.example/api/auth/callback';
  process.env.SESSION_COOKIE_SECURE = 'false';
  db = createDb(container.getConnectionUri());
  await runMigrations(db);
}, 120_000);

afterAll(async () => {
  await closeDb(db);
  await container?.stop();
  delete process.env.DATABASE_URL;
  delete process.env.OIDC_ISSUER_URL;
  delete process.env.OIDC_INTERNAL_URL;
  delete process.env.OIDC_CLIENT_ID;
  delete process.env.OIDC_CLIENT_SECRET;
  delete process.env.OIDC_REDIRECT_URI;
  delete process.env.SESSION_COOKIE_SECURE;
});

describe('identity — auth disabled', () => {
  let app: INestApplication;

  beforeAll(async () => {
    delete process.env.AUTH_ENABLED;
    app = await buildApp(false);
  });
  afterAll(() => app.close());

  const api = () => request(app.getHttpServer());

  it('GET /auth/me is the fixed local user (from the 0001 seed)', async () => {
    const me = await api().get('/api/auth/me');
    expect(me.status).toBe(200);
    expect(me.body).toMatchObject({ email: 'ada@example.com' });
  });

  it('the removed password endpoints are gone (404)', async () => {
    expect((await api().post('/api/auth/sign-in').send({})).status).toBe(404);
    expect((await api().post('/api/auth/register').send({})).status).toBe(404);
  });
});

describe('identity — BFF OIDC flow', () => {
  let app: INestApplication;

  beforeAll(async () => {
    process.env.AUTH_ENABLED = 'true';
    app = await buildApp(true);
  });
  afterAll(async () => {
    await app.close();
    delete process.env.AUTH_ENABLED;
  });

  const api = () => request(app.getHttpServer());

  /** Drive login → callback and return the `wmp.sid` cookie. */
  async function logIn(): Promise<string> {
    const login = await api().get('/api/auth/login');
    const state = /state=([0-9a-f-]{36})/.exec(login.headers.location)![1];
    const cb = await api()
      .get(`/api/auth/callback?code=the-code&state=${state}`)
      .set('Cookie', cookie(login, 'wmp.oidc_state'));
    return cookie(cb, 'wmp.sid');
  }

  it('the global guard protects another context (songs) with no session', async () => {
    expect((await api().get('/api/songs')).status).toBe(401);
  });

  it('login redirects to Keycloak and sets a state cookie', async () => {
    const res = await api().get('/api/auth/login');
    expect(res.status).toBe(302);
    expect(res.headers.location).toContain('/protocol/openid-connect/auth');
    expect(res.headers.location).toMatch(/state=[0-9a-f-]{36}/);
    expect(() => cookie(res, 'wmp.oidc_state')).not.toThrow();
  });

  it('login?register=1 redirects to the Keycloak sign-up form', async () => {
    const res = await api().get('/api/auth/login?register=1');
    expect(res.status).toBe(302);
    expect(res.headers.location).toContain(
      '/protocol/openid-connect/registrations',
    );
  });

  it('login?register=0 does NOT redirect to sign-up — only the literal "1" does', async () => {
    const res = await api().get('/api/auth/login?register=0');
    expect(res.status).toBe(302);
    expect(res.headers.location).toContain('/protocol/openid-connect/auth');
    expect(res.headers.location).not.toContain('registrations');
  });

  it('rejects a callback whose state does not match the cookie', async () => {
    const login = await api().get('/api/auth/login');
    const res = await api()
      .get('/api/auth/callback?code=abc&state=not-the-state')
      .set('Cookie', cookie(login, 'wmp.oidc_state'));
    expect(res.status).toBe(400);
  });

  it('a Keycloak token-exchange failure during callback is a 401, not a 500', async () => {
    const login = await api().get('/api/auth/login');
    const state = /state=([0-9a-f-]{36})/.exec(login.headers.location)![1];
    fakeOidc.exchangeCode.mockRejectedValueOnce(new Error('token endpoint returned 400'));
    const res = await api()
      .get(`/api/auth/callback?code=bad-code&state=${state}`)
      .set('Cookie', cookie(login, 'wmp.oidc_state'));
    expect(res.status).toBe(401);
  });

  it('two different Keycloak subjects sharing an email get a 409, not a 500', async () => {
    const login1 = await api().get('/api/auth/login');
    const state1 = /state=([0-9a-f-]{36})/.exec(login1.headers.location)![1];
    fakeVerifier.verify.mockResolvedValueOnce({
      subject: asUuid('c1a11111-1111-4111-8111-111111111111'),
      email: 'shared@example.com',
      name: 'First',
    });
    const cb1 = await api()
      .get(`/api/auth/callback?code=code-1&state=${state1}`)
      .set('Cookie', cookie(login1, 'wmp.oidc_state'));
    expect(cb1.status).toBe(302);

    const login2 = await api().get('/api/auth/login');
    const state2 = /state=([0-9a-f-]{36})/.exec(login2.headers.location)![1];
    fakeVerifier.verify.mockResolvedValueOnce({
      subject: asUuid('c2b22222-2222-4222-8222-222222222222'),
      email: 'shared@example.com',
      name: 'Second',
    });
    const cb2 = await api()
      .get(`/api/auth/callback?code=code-2&state=${state2}`)
      .set('Cookie', cookie(login2, 'wmp.oidc_state'));
    expect(cb2.status).toBe(409);
  });

  it('login writes a users projection row and a sessions row, then serves /auth/me', async () => {
    const session = await logIn();
    const sid = asUuid(session.split('=')[1]);

    expect(fakeOidc.exchangeCode).toHaveBeenCalledWith('the-code');

    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, SUB));
    expect(user).toMatchObject({
      email: 'dev@example.com',
      displayName: 'Dev User',
    });

    const [row] = await db
      .select()
      .from(sessionsTable)
      .where(eq(sessionsTable.id, sid));
    expect(row?.userId).toBe(SUB);

    const me = await api().get('/api/auth/me').set('Cookie', session);
    expect(me.status).toBe(200);
    expect(me.body).toMatchObject({ email: 'dev@example.com' });
  });

  it('refreshes an expired access token and persists the new pair', async () => {
    const session = await logIn();
    const sid = asUuid(session.split('=')[1]);

    // Force the stored access token stale, then make a guarded request.
    const repo = app.get<SessionRepository>(SessionRepository);
    const s = await repo.byId(sid);
    await repo.save(
      new Session(
        s!.id,
        s!.userId,
        s!.createdAt,
        s!.expiresAt,
        s!.accessToken,
        s!.refreshToken,
        new Date(Date.now() - 60_000),
      ),
    );

    const me = await api().get('/api/auth/me').set('Cookie', session);
    expect(me.status).toBe(200);
    expect(fakeOidc.refresh).toHaveBeenCalledWith('refresh-1');

    const [row] = await db
      .select()
      .from(sessionsTable)
      .where(eq(sessionsTable.id, sid));
    expect(row?.accessToken).toBe('access-2');
    expect(row?.refreshToken).toBe('refresh-2');
  });

  it('a cold app instance (process restart) still resolves the session', async () => {
    const session = await logIn();
    const cold = await buildApp(true);
    const me = await request(cold.getHttpServer())
      .get('/api/auth/me')
      .set('Cookie', session);
    await cold.close();
    expect(me.status).toBe(200);
    expect(me.body).toMatchObject({ email: 'dev@example.com' });
  });

  it('logout revokes at Keycloak, deletes the sessions row and clears the cookie', async () => {
    const session = await logIn();
    const sid = asUuid(session.split('=')[1]);

    const out = await api().post('/api/auth/logout').set('Cookie', session);
    expect(out.status).toBe(204);
    expect(fakeOidc.endSession).toHaveBeenCalledWith('refresh-1');

    const rows = await db
      .select()
      .from(sessionsTable)
      .where(eq(sessionsTable.id, sid));
    expect(rows).toHaveLength(0);

    expect(
      (await api().get('/api/auth/me').set('Cookie', session)).status,
    ).toBe(401);
  });
});
