import 'reflect-metadata';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import {
  PostgreSqlContainer,
  type StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { OidcClient } from '../src/identity/application/oidc-client';
import { TokenVerifier } from '../src/identity/application/token-verifier';
import type { Db } from '../src/shared/db/client';
import { DB } from '../src/shared/db/database.module';
import { runMigrations } from '../src/shared/db/migrate';
import { asUuid, type Uuid } from '../src/shared/domain/uuid';
import { configureApp } from '../src/setup';
import { MP3 } from './mp3-fixture';

// Songs are owned per user: every /api/songs route must scope to the session
// user, so another user's song looks exactly like a missing one (404, or a
// no-op 204 for the idempotent DELETE). Runs
// with AUTH_ENABLED=true so two distinct users can be logged in and compared.

const USER_A = asUuid('a1111111-1111-4111-8111-111111111111');
const USER_B = asUuid('b2222222-2222-4222-8222-222222222222');

let currentSubject: Uuid = USER_A;

const fakeOidc = {
  authorizeUrl: ({ state }: { state: string }) =>
    `https://kc.example/realms/wmp/protocol/openid-connect/auth?state=${state}`,
  exchangeCode: vi.fn(async () => ({
    accessToken: 'access-token',
    refreshToken: 'refresh-token',
    expiresInSeconds: 300,
  })),
  refresh: vi.fn(),
  endSession: vi.fn(async () => undefined),
};

const fakeVerifier = {
  verify: vi.fn(async () => ({
    subject: currentSubject,
    email: `${currentSubject}@example.com`,
    name: 'Test User',
  })),
};

let container: StartedPostgreSqlContainer;
let app: INestApplication;

const api = () => request(app.getHttpServer());

function cookie(res: request.Response, name: string): string {
  const raw = res.headers['set-cookie'] as unknown as string[] | undefined;
  const hit = (raw ?? []).find((c) => c.startsWith(`${name}=`));
  if (!hit) throw new Error(`no ${name} cookie in response`);
  return hit.split(';')[0];
}

/** Log in as `subject` and return the `wmp.sid` cookie for that session. */
async function logInAs(subject: Uuid): Promise<string> {
  currentSubject = subject;
  const login = await api().get('/api/auth/login');
  const state = /state=([0-9a-f-]{36})/.exec(login.headers.location)![1];
  const cb = await api()
    .get(`/api/auth/callback?code=the-code&state=${state}`)
    .set('Cookie', cookie(login, 'wmp.oidc_state'));
  return cookie(cb, 'wmp.sid');
}

beforeAll(async () => {
  container = await new PostgreSqlContainer('postgres:17-alpine').start();
  process.env.DATABASE_URL = container.getConnectionUri();
  process.env.AUTH_ENABLED = 'true';
  process.env.OIDC_ISSUER_URL = 'https://kc.example/realms/wmp';
  process.env.OIDC_INTERNAL_URL = 'https://kc.example/realms/wmp';
  process.env.OIDC_CLIENT_ID = 'wmp-api';
  process.env.OIDC_CLIENT_SECRET = 'test-secret';
  process.env.OIDC_REDIRECT_URI = 'https://app.example/api/auth/callback';
  process.env.SESSION_COOKIE_SECURE = 'false';

  const { AppModule } = await import('../src/app.module');
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(OidcClient)
    .useValue(fakeOidc)
    .overrideProvider(TokenVerifier)
    .useValue(fakeVerifier)
    .compile();
  app = moduleRef.createNestApplication();
  configureApp(app);
  await app.init();
  await runMigrations(app.get<Db>(DB));
}, 120_000);

afterAll(async () => {
  await app?.close();
  await container?.stop();
  delete process.env.DATABASE_URL;
  delete process.env.AUTH_ENABLED;
  delete process.env.OIDC_ISSUER_URL;
  delete process.env.OIDC_INTERNAL_URL;
  delete process.env.OIDC_CLIENT_ID;
  delete process.env.OIDC_CLIENT_SECRET;
  delete process.env.OIDC_REDIRECT_URI;
  delete process.env.SESSION_COOKIE_SECURE;
});

describe('songs: ownership isolation', () => {
  let sessionA: string;
  let sessionB: string;
  let songId: string;

  beforeAll(async () => {
    sessionA = await logInAs(USER_A);
    sessionB = await logInAs(USER_B);
    const uploaded = await api()
      .post('/api/songs')
      .set('Cookie', sessionA)
      .attach('file', MP3, { filename: 'a.mp3', contentType: 'audio/mpeg' });
    expect(uploaded.status).toBe(201);
    expect(uploaded.body.ownerId).toBe(USER_A);
    songId = uploaded.body.id;
  });

  it("lists a song for its owner but not for another user", async () => {
    const listA = await api().get('/api/songs').set('Cookie', sessionA);
    expect(listA.body.map((s: { id: string }) => s.id)).toContain(songId);

    const listB = await api().get('/api/songs').set('Cookie', sessionB);
    expect(listB.status).toBe(200);
    expect(listB.body.map((s: { id: string }) => s.id)).not.toContain(songId);
  });

  it("a user cannot read, stream, fetch the cover of, retag, or delete another user's song", async () => {
    const asB = (req: request.Test) => req.set('Cookie', sessionB);

    expect((await asB(api().get(`/api/songs/${songId}`))).status).toBe(404);
    expect((await asB(api().get(`/api/songs/${songId}/audio`))).status).toBe(404);
    expect((await asB(api().get(`/api/songs/${songId}/cover`))).status).toBe(404);
    expect(
      (await asB(api().patch(`/api/songs/${songId}`)).send({ title: 'Hijacked' })).status,
    ).toBe(404);
    // Delete is idempotent (unknown id → 204 no-op), so B's delete "succeeds"
    // without touching A's song — the check below is what matters.
    expect((await asB(api().delete(`/api/songs/${songId}`))).status).toBe(204);

    const stillA = await api().get(`/api/songs/${songId}`).set('Cookie', sessionA);
    expect(stillA.status).toBe(200);
    expect(stillA.body.title).toBe('Test Silence');
    const audioA = await api().get(`/api/songs/${songId}/audio`).set('Cookie', sessionA);
    expect(audioA.status).toBe(200);
  });

  it('every songs route is a 401 without a session', async () => {
    expect((await api().get('/api/songs')).status).toBe(401);
    expect((await api().get(`/api/songs/${songId}`)).status).toBe(401);
    expect((await api().get(`/api/songs/${songId}/audio`)).status).toBe(401);
    expect((await api().get(`/api/songs/${songId}/cover`)).status).toBe(401);
    expect((await api().patch(`/api/songs/${songId}`).send({ title: 'x' })).status).toBe(401);
    expect((await api().delete(`/api/songs/${songId}`)).status).toBe(401);
    expect(
      (
        await api()
          .post('/api/songs')
          .attach('file', MP3, { filename: 'anon.mp3', contentType: 'audio/mpeg' })
      ).status,
    ).toBe(401);
  });
});
