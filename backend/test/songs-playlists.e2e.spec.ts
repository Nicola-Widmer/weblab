import 'reflect-metadata';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import {
  PostgreSqlContainer,
  type StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PlaylistReconciliationSweep } from '../src/playlists/application/playlist-reconciliation-sweep';
import type { Db } from '../src/shared/db/client';
import { DB } from '../src/shared/db/database.module';
import { runMigrations } from '../src/shared/db/migrate';
import { configureApp } from '../src/setup';

// Seed ids come from `drizzle/0001_seed.sql`, which `runMigrations` applies along
// with the schema — the DB-backed run starts from the same fixtures the
// in-memory adapters used to hard-code.
const SEED_SONG_A = '11111111-2222-4333-8444-555555555551';
const SEED_SONG_B = '11111111-2222-4333-8444-555555555552';

let container: StartedPostgreSqlContainer;
let app: INestApplication;

/**
 * Poll `assertion` until it stops throwing or `timeoutMs` elapses. The
 * `SongDeleted` handler runs fire-and-forget (ADR-0002), so the playlist rows
 * settle a few async DB round-trips after the delete responds.
 */
async function waitFor(assertion: () => Promise<void>, timeoutMs = 2000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    try {
      await assertion();
      return;
    } catch (err) {
      if (Date.now() >= deadline) throw err;
      await new Promise((r) => setTimeout(r, 25));
    }
  }
}

beforeAll(async () => {
  container = await new PostgreSqlContainer('postgres:17-alpine').start();
  // `songs` / `playlists` modules pick their repository from this at import
  // time, so it has to be set before `AppModule` is loaded.
  process.env.DATABASE_URL = container.getConnectionUri();

  const { AppModule } = await import('../src/app.module');
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  app = moduleRef.createNestApplication();
  configureApp(app);
  await app.init();

  await runMigrations(app.get<Db>(DB));
}, 120_000);

afterAll(async () => {
  await app?.close();
  await container?.stop();
  // Vitest reuses the worker process; don't leak the URL into other spec files.
  delete process.env.DATABASE_URL;
});

const api = () => request(app.getHttpServer());
const songIds = (body: Array<{ entries: Array<{ songId: string }> }>) =>
  body.map((p) => p.entries.map((e) => e.songId));

describe('songs -> playlists via the event bus', () => {
  it('deleting a song removes every occurrence from every playlist', async () => {
    const before = await api().get('/api/playlists');
    expect(before.body.map((p: { name: string }) => p.name)).toEqual(['Focus', 'Piano']);
    expect(songIds(before.body)).toEqual([
      [SEED_SONG_A, SEED_SONG_B],
      [SEED_SONG_B, SEED_SONG_B],
    ]);

    expect((await api().delete(`/api/songs/${SEED_SONG_A}`)).status).toBe(204);

    await waitFor(async () => {
      const after = await api().get('/api/playlists');
      expect(songIds(after.body)).toEqual([[SEED_SONG_B], [SEED_SONG_B, SEED_SONG_B]]);
    });

    const songs = await api().get('/api/songs');
    expect(songs.body.map((s: { id: string }) => s.id)).toEqual([SEED_SONG_B]);
  });

  it('deleting an unknown song is a no-op (still 204)', async () => {
    const res = await api().delete('/api/songs/22222222-3333-4444-8555-666666666666');
    expect(res.status).toBe(204);
  });
});

describe('playlist entries', () => {
  it('adds the same song twice, then removes one occurrence', async () => {
    const created = await api().post('/api/playlists').send({ name: 'Doubles' });
    expect(created.status).toBe(201);
    const id: string = created.body.id;

    await api().post(`/api/playlists/${id}/entries`).send({ songId: SEED_SONG_B });
    const twice = await api().post(`/api/playlists/${id}/entries`).send({ songId: SEED_SONG_B });
    expect(twice.body.entries).toHaveLength(2);
    expect(twice.body.entries.map((e: { songId: string }) => e.songId)).toEqual([
      SEED_SONG_B,
      SEED_SONG_B,
    ]);

    const firstEntryId: string = twice.body.entries[0].id;
    const afterRemove = await api().delete(`/api/playlists/${id}/entries/${firstEntryId}`);
    expect(afterRemove.status).toBe(204);

    const reread = await api().get(`/api/playlists/${id}`);
    expect(reread.body.entries).toHaveLength(1);
    expect(reread.body.entries[0].position).toBe(0);
  });
});

describe('playlist reconciliation sweep (ADR-0002 backstop)', () => {
  it('removes entries whose song no longer exists, without going through the SongDeleted handler', async () => {
    const created = await api().post('/api/playlists').send({ name: 'Orphan test' });
    const id: string = created.body.id;
    // No FK on playlist_entries.song_id (see schema.ts) — a "song" that never
    // existed is a stand-in for one whose SongDeleted reaction was dropped.
    const ghostSongId = '99999999-8888-4777-8666-555555555555';
    const added = await api()
      .post(`/api/playlists/${id}/entries`)
      .send({ songId: ghostSongId });
    expect(added.body.entries).toHaveLength(1);

    const sweep = app.get(PlaylistReconciliationSweep);
    await sweep.sweep();

    const reread = await api().get(`/api/playlists/${id}`);
    expect(reread.body.entries).toHaveLength(0);
  });
});
