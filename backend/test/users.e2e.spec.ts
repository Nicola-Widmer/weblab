import 'reflect-metadata';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/setup';

let app: INestApplication;

beforeAll(async () => {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  app = moduleRef.createNestApplication();
  configureApp(app);
  await app.init();
});

afterAll(async () => {
  await app.close();
});

describe('users', () => {
  it('GET /api/user returns the current user', async () => {
    const res = await request(app.getHttpServer()).get('/api/user');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: expect.any(String), email: expect.any(String) });
  });

  it('PUT /api/user replaces and echoes it back', async () => {
    const res = await request(app.getHttpServer())
      .put('/api/user')
      .send({ name: 'Grace', email: 'grace@example.com' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ id: 'local', name: 'Grace', email: 'grace@example.com' });
  });

  it('PUT /api/user rejects an invalid body (400)', async () => {
    const res = await request(app.getHttpServer())
      .put('/api/user')
      .send({ name: 'Grace', email: 'not-an-email' });
    expect(res.status).toBe(400);
  });

  it('PUT /api/user rejects unknown properties (400)', async () => {
    const res = await request(app.getHttpServer())
      .put('/api/user')
      .send({ name: 'Grace', email: 'grace@example.com', role: 'admin' });
    expect(res.status).toBe(400);
  });
});
