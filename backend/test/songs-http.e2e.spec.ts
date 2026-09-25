import 'reflect-metadata';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import {
  PostgreSqlContainer,
  type StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Db } from '../src/shared/db/client';
import { DB } from '../src/shared/db/database.module';
import { runMigrations } from '../src/shared/db/migrate';
import { configureApp } from '../src/setup';

let container: StartedPostgreSqlContainer;
let app: INestApplication;

// A real ~0.25 s silent MP3 with an ID3v2 tag (title "Test Silence", artist
// "Vitest") and a Xing header, so `music-metadata` reads tags + a duration.
const MP3 = Buffer.from(
  'SUQzAwAAAAAATVRJVDIAAAAOAAAAVGVzdCBTaWxlbmNlAFRQRTEAAAAIAAAAVml0ZXN0AFRTU0UAAAAPAAAATGF2ZjYyLjEyLjEwMQAAAAAAAAAAAAAA//tAwAAAAAAAAAAAAAAAAAAAAAAASW5mbwAAAA8AAAALAAAFMwA3Nzc3Nzc3NzdLS0tLS0tLS0tfX19fX19fX19zc3Nzc3Nzc3OHh4eHh4eHh4ebm5ubm5ubm5uvr6+vr6+vr6/Dw8PDw8PDw8PX19fX19fX19fr6+vr6+vr6+v///////////8AAAAATGF2YzYyLjI4AAAAAAAAAAAAAAAAJAQvAAAAAAAABTMXaM+kAAAAAAD/+xDEAAPAAAGkAAAAIAAANIAAAARMQU1FMy4xMDBVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVTEFNRTMuMTAwVf/7EsQpg8AAAaQAAAAgAAA0gAAABFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVTEFNRTMuMTAwVf/7EMRTg8AAAaQAAAAgAAA0gAAABFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVMQU1FMy4xMDBV//sSxH0DwAABpAAAACAAADSAAAAEVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVMQU1FMy4xMDBV//sQxKcDwAABpAAAACAAADSAAAAEVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVUxBTUUzLjEwMFX/+xLE0IPAAAGkAAAAIAAANIAAAARVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/+xDE1gPAAAGkAAAAIAAANIAAAARVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVf/7EsTVg8AAAaQAAAAgAAA0gAAABFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVf/7EMTWA8AAAaQAAAAgAAA0gAAABFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV//sSxNWDwAABpAAAACAAADSAAAAEVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV//sQxNYDwAABpAAAACAAADSAAAAEVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVU=',
  'base64',
);

/** Force superagent to hand back the raw response body as a Buffer. */
function binary(res: NodeJS.ReadableStream, cb: (err: Error | null, body: Buffer) => void): void {
  const chunks: Buffer[] = [];
  res.on('data', (c: Buffer) => chunks.push(c));
  res.on('end', () => cb(null, Buffer.concat(chunks)));
}

beforeAll(async () => {
  container = await new PostgreSqlContainer('postgres:17-alpine').start();
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
  delete process.env.DATABASE_URL;
});

const api = () => request(app.getHttpServer());

describe('songs HTTP: upload, audio range, cover', () => {
  let id: string;

  it('POST /api/songs parses the .mp3 and returns the song', async () => {
    const res = await api()
      .post('/api/songs')
      .attach('file', MP3, { filename: 'nocturne.mp3', contentType: 'audio/mpeg' });
    expect(res.status).toBe(201);
    // title/artist come from the ID3 tag, not the filename
    expect(res.body).toMatchObject({
      title: 'Test Silence',
      artist: 'Vitest',
      hasCover: false,
    });
    id = res.body.id;
  });

  it('rejects a non-mp3 upload (400)', async () => {
    const res = await api()
      .post('/api/songs')
      .attach('file', Buffer.from('x'), { filename: 'a.txt', contentType: 'text/plain' });
    expect(res.status).toBe(400);
  });

  it('rejects an .mp3 whose bytes are not an MP3 (400)', async () => {
    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const res = await api()
      .post('/api/songs')
      .attach('file', png, { filename: 'fake.mp3', contentType: 'audio/mpeg' });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('File content is not an MP3');
  });

  it('rejects an .mp3 that cannot be parsed (400)', async () => {
    const res = await api()
      .post('/api/songs')
      .attach('file', Buffer.from('ID3 but not really an mp3'), {
        filename: 'broken.mp3',
        contentType: 'audio/mpeg',
      });
    expect(res.status).toBe(400);
  });

  it('GET /audio without Range → 200, full body, Accept-Ranges', async () => {
    const res = await api().get(`/api/songs/${id}/audio`).buffer(true).parse(binary);
    expect(res.status).toBe(200);
    expect(res.headers['accept-ranges']).toBe('bytes');
    expect(res.headers['content-type']).toContain('audio/mpeg');
    expect(res.headers['content-length']).toBe(String(MP3.length));
    expect(Buffer.from(res.body).equals(MP3)).toBe(true);
  });

  it('GET /audio with Range → 206, Content-Range, sliced body', async () => {
    const res = await api()
      .get(`/api/songs/${id}/audio`)
      .set('Range', 'bytes=2-5')
      .buffer(true)
      .parse(binary);
    expect(res.status).toBe(206);
    expect(res.headers['content-range']).toBe(`bytes 2-5/${MP3.length}`);
    expect(res.headers['content-length']).toBe('4');
    expect(Buffer.from(res.body).equals(MP3.subarray(2, 6))).toBe(true);
  });

  it('GET /audio with an unsatisfiable Range → 416', async () => {
    const res = await api().get(`/api/songs/${id}/audio`).set('Range', 'bytes=9999-');
    expect(res.status).toBe(416);
  });

  it('GET /cover on a song without a cover → 404', async () => {
    const res = await api().get(`/api/songs/${id}/cover`);
    expect(res.status).toBe(404);
  });

  it('GET /audio for an unknown id → 404', async () => {
    const res = await api().get(
      '/api/songs/00000000-0000-4000-8000-000000000000/audio',
    );
    expect(res.status).toBe(404);
  });
});
