import 'reflect-metadata';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Readable } from 'node:stream';
import { NotFoundException } from '@nestjs/common';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { FileStorage } from '../src/songs/application/file-storage';
import { InMemoryFileStorage } from '../src/songs/infrastructure/in-memory-file-storage';
import { LocalFileStorage } from '../src/songs/infrastructure/local-file-storage';

const KEY = '11111111-2222-4333-8444-555555555551';
const MISSING = '99999999-9999-4999-8999-999999999999';
const DATA = Buffer.from('0123456789abcdef'); // 16 bytes

async function drain(stream: Readable): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks).toString();
}

interface Adapter {
  name: string;
  create(): Promise<{ store: FileStorage; cleanup: () => Promise<void> }>;
}

const adapters: Adapter[] = [
  {
    name: 'InMemoryFileStorage',
    create: async () => ({
      store: new InMemoryFileStorage(),
      cleanup: async () => {},
    }),
  },
  {
    name: 'LocalFileStorage',
    create: async () => {
      const dir = await mkdtemp(join(tmpdir(), 'lfs-'));
      process.env.STORAGE_LOCAL_DIR = dir; // read in the class field initializer
      const store = new LocalFileStorage();
      return {
        store,
        cleanup: async () => {
          delete process.env.STORAGE_LOCAL_DIR;
          await rm(dir, { recursive: true, force: true });
        },
      };
    },
  },
];

describe.each(adapters)('$name', ({ create }) => {
  let store: FileStorage;
  let cleanup: () => Promise<void>;

  beforeEach(async () => {
    ({ store, cleanup } = await create());
  });
  afterEach(() => cleanup());

  it('reports a missing key from stat and getRange', async () => {
    expect(await store.stat(MISSING)).toBeNull();
    await expect(store.getRange(MISSING)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('round-trips a put via stat and a full read', async () => {
    await store.put(KEY, DATA, 'audio/mpeg');
    expect(await store.stat(KEY)).toEqual({ sizeBytes: 16 });

    const r = await store.getRange(KEY);
    expect([r.contentLength, r.totalSize]).toEqual([16, 16]);
    expect(await drain(r.stream)).toBe('0123456789abcdef');
  });

  it('serves inclusive ranges and clamps to EOF', async () => {
    await store.put(KEY, DATA, 'audio/mpeg');

    const mid = await store.getRange(KEY, { start: 4, end: 9 });
    expect(mid.contentLength).toBe(6);
    expect(await drain(mid.stream)).toBe('456789');

    const open = await store.getRange(KEY, { start: 10 });
    expect(await drain(open.stream)).toBe('abcdef');

    const over = await store.getRange(KEY, { start: 12, end: 999 });
    expect([over.contentLength, over.totalSize]).toEqual([4, 16]);
    expect(await drain(over.stream)).toBe('cdef');
  });

  it('rejects an unsatisfiable range with 416', async () => {
    await store.put(KEY, DATA, 'audio/mpeg');
    await expect(store.getRange(KEY, { start: 99 })).rejects.toMatchObject({
      status: 416,
    });
  });

  it('overwrites on re-put and deletes idempotently', async () => {
    await store.put(KEY, DATA, 'audio/mpeg');
    await store.put(KEY, Buffer.from('new'), 'audio/mpeg');
    expect(await store.stat(KEY)).toEqual({ sizeBytes: 3 });

    await store.delete(KEY);
    expect(await store.stat(KEY)).toBeNull();
    await expect(store.delete(KEY)).resolves.toBeUndefined();
  });
});
