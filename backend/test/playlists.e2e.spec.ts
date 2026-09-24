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

// Playlist CRUD, ownership isolation, and the input-validation paths that the
// domain guards (`requireName`, `reorder`'s permutation check) but the HTTP
// edge didn't translate to a clean 4xx before this diff's fixes. Runs with
// AUTH_ENABLED=true so two distinct users can be logged in and compared.

const USER_A = asUuid('a1111111-1111-4111-8111-111111111111');
const USER_B = asUuid('b2222222-2222-4222-8222-222222222222');
const UNKNOWN_ID = '00000000-0000-4000-8000-000000000000';

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

describe('playlists: CRUD, ownership isolation, validation', () => {
  let sessionA: string;
  let sessionB: string;

  beforeAll(async () => {
    sessionA = await logInAs(USER_A);
    sessionB = await logInAs(USER_B);
  });

  function asUser(session: string) {
    return {
      get: (url: string) => api().get(url).set('Cookie', session),
      post: (url: string) => api().post(url).set('Cookie', session),
      patch: (url: string) => api().patch(url).set('Cookie', session),
      put: (url: string) => api().put(url).set('Cookie', session),
      delete: (url: string) => api().delete(url).set('Cookie', session),
    };
  }
  const asA = () => asUser(sessionA);
  const asB = () => asUser(sessionB);

  it('creates a playlist, listed for its owner but not for another user', async () => {
    const created = await asA().post('/api/playlists').send({ name: 'Roadtrip' });
    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({ name: 'Roadtrip', entries: [], trackCount: 0 });

    const listA = await asA().get('/api/playlists');
    expect(listA.body.map((p: { name: string }) => p.name)).toContain('Roadtrip');

    const listB = await asB().get('/api/playlists');
    expect(listB.body.map((p: { name: string }) => p.name)).not.toContain('Roadtrip');
  });

  it('lists playlists oldest first, ties broken by id', async () => {
    for (const name of ['Zeta', 'Alpha', 'Mid']) {
      expect((await asB().post('/api/playlists').send({ name })).status).toBe(201);
    }

    const list: Array<{ id: string; createdAt: string }> = (
      await asB().get('/api/playlists')
    ).body;
    const key = (p: { id: string; createdAt: string }) => `${p.createdAt} ${p.id}`;
    expect(list.map(key)).toEqual(list.map(key).sort());
  });

  it('rejects an empty or whitespace-only name with 400, not 500', async () => {
    expect((await asA().post('/api/playlists').send({ name: '' })).status).toBe(400);
    expect((await asA().post('/api/playlists').send({ name: '   ' })).status).toBe(400);
  });

  it('renames a playlist, and rejects a whitespace-only rename with 400', async () => {
    const created = await asA().post('/api/playlists').send({ name: 'Before' });
    const id: string = created.body.id;

    const renamed = await asA().patch(`/api/playlists/${id}`).send({ name: 'After' });
    expect(renamed.status).toBe(200);
    expect(renamed.body.name).toBe('After');

    expect(
      (await asA().patch(`/api/playlists/${id}`).send({ name: '   ' })).status,
    ).toBe(400);
  });

  it('deletes a playlist; a subsequent get is 404', async () => {
    const created = await asA().post('/api/playlists').send({ name: 'ToDelete' });
    const id: string = created.body.id;

    expect((await asA().delete(`/api/playlists/${id}`)).status).toBe(204);
    expect((await asA().get(`/api/playlists/${id}`)).status).toBe(404);
  });

  it('404s every operation against an unknown playlist id', async () => {
    expect((await asA().get(`/api/playlists/${UNKNOWN_ID}`)).status).toBe(404);
    expect(
      (await asA().patch(`/api/playlists/${UNKNOWN_ID}`).send({ name: 'x' })).status,
    ).toBe(404);
    expect((await asA().delete(`/api/playlists/${UNKNOWN_ID}`)).status).toBe(404);
    expect(
      (
        await asA()
          .post(`/api/playlists/${UNKNOWN_ID}/entries`)
          .send({ songId: UNKNOWN_ID })
      ).status,
    ).toBe(404);
    expect(
      (await asA().delete(`/api/playlists/${UNKNOWN_ID}/entries/${UNKNOWN_ID}`)).status,
    ).toBe(404);
    expect(
      (
        await asA()
          .put(`/api/playlists/${UNKNOWN_ID}/entries`)
          .send({ entryIds: [UNKNOWN_ID] })
      ).status,
    ).toBe(404);
  });

  it("a user cannot read, rename, delete, or add to another user's playlist", async () => {
    const created = await asA().post('/api/playlists').send({ name: "A's playlist" });
    const id: string = created.body.id;

    expect((await asB().get(`/api/playlists/${id}`)).status).toBe(404);
    expect(
      (await asB().patch(`/api/playlists/${id}`).send({ name: 'Hijacked' })).status,
    ).toBe(404);
    expect(
      (await asB().post(`/api/playlists/${id}/entries`).send({ songId: UNKNOWN_ID })).status,
    ).toBe(404);
    expect((await asB().delete(`/api/playlists/${id}`)).status).toBe(404);

    const stillA = await asA().get(`/api/playlists/${id}`);
    expect(stillA.status).toBe(200);
    expect(stillA.body.name).toBe("A's playlist");
  });

  it('reorders entries, and rejects a non-matching entryIds list with 400, not 500', async () => {
    const created = await asA().post('/api/playlists').send({ name: 'Reorderable' });
    const id: string = created.body.id;

    const songX = '11111111-2222-4333-8444-555555555551';
    const songY = '11111111-2222-4333-8444-555555555552';
    await asA().post(`/api/playlists/${id}/entries`).send({ songId: songX });
    const afterAdd = await asA().post(`/api/playlists/${id}/entries`).send({ songId: songY });
    const [first, second] = afterAdd.body.entries as Array<{ id: string }>;

    const reordered = await asA()
      .put(`/api/playlists/${id}/entries`)
      .send({ entryIds: [second.id, first.id] });
    expect(reordered.status).toBe(200);
    expect(reordered.body.entries.map((e: { id: string }) => e.id)).toEqual([
      second.id,
      first.id,
    ]);
    expect(reordered.body.entries.map((e: { position: number }) => e.position)).toEqual([
      0, 1,
    ]);

    const badReorder = await asA()
      .put(`/api/playlists/${id}/entries`)
      .send({ entryIds: [first.id, UNKNOWN_ID] });
    expect(badReorder.status).toBe(400);
  });

  it('rejects a non-UUID songId on addEntry with 400', async () => {
    const created = await asA().post('/api/playlists').send({ name: 'Validated' });
    const id: string = created.body.id;
    const res = await asA().post(`/api/playlists/${id}/entries`).send({ songId: 'not-a-uuid' });
    expect(res.status).toBe(400);
  });
});
