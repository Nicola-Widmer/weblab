import { randomUUID } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { mkdir, rename, rm, stat as fsStat, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import {
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  FileStorage,
  type ByteRange,
  type RangeResult,
} from '../application/file-storage';

/**
 * Filesystem-backed `FileStorage` (ADR-0004, `STORAGE_DRIVER=local`). One file
 * per key under `STORAGE_LOCAL_DIR`; keys are opaque UUIDs from `IdGenerator`.
 * No content type is stored — the `Song` aggregate owns it.
 */
@Injectable()
export class LocalFileStorage extends FileStorage {
  private readonly root = resolve(process.env.STORAGE_LOCAL_DIR ?? './uploads');

  /** Write atomically: to a temp file in the same dir, then `rename` into place. */
  async put(key: string, data: Buffer, _contentType: string): Promise<void> {
    const target = this.pathFor(key);
    await mkdir(this.root, { recursive: true });
    const tmp = `${target}.${randomUUID()}.tmp`;
    try {
      await writeFile(tmp, data);
      await rename(tmp, target);
    } catch (err) {
      await rm(tmp, { force: true });
      throw err;
    }
  }

  /** Resolve a key to an absolute path, rejecting anything that could escape root. */
  private pathFor(key: string): string {
    if (!key || key.includes('/') || key.includes('\\') || key.includes('..')) {
      throw new Error(`Invalid storage key: ${key}`);
    }
    return join(this.root, key);
  }

  /**
   * Stream a byte range for playback and seeking (HTTP 206). With no `range`,
   * streams the whole object. `start`/`end` are inclusive, matching the HTTP
   * `Range` header and `fs.createReadStream`.
   */
  async getRange(key: string, range?: ByteRange): Promise<RangeResult> {
    const path = this.pathFor(key);

    let totalSize: number;
    try {
      totalSize = (await fsStat(path)).size;
    } catch (err) {
      if (isNotFound(err)) throw new NotFoundException('Object not found');
      throw err;
    }

    if (!range) {
      return { stream: createReadStream(path), contentLength: totalSize, totalSize };
    }

    // HTTP byte positions are 0-indexed and inclusive on both ends, so the last
    // valid position is `totalSize - 1`. An open range (`bytes=10-`) ends there;
    // an over-long one (`bytes=10-999`) is clamped to it.
    const start = range.start;
    const end = Math.min(range.end ?? totalSize - 1, totalSize - 1);
    if (start < 0 || start > end) {
      throw new HttpException(
        'Requested range not satisfiable',
        HttpStatus.REQUESTED_RANGE_NOT_SATISFIABLE,
      );
    }

    return {
      // `createReadStream` treats `start`/`end` as inclusive too — pass through.
      stream: createReadStream(path, { start, end }),
      // Both ends included → count is `end - start + 1` (e.g. 4..9 is 6 bytes).
      contentLength: end - start + 1,
      totalSize,
    };
  }

  async delete(key: string): Promise<void> {
    await rm(this.pathFor(key), { force: true });
  }

  async stat(key: string): Promise<{ sizeBytes: number } | null> {
    try {
      return { sizeBytes: (await fsStat(this.pathFor(key))).size };
    } catch (err) {
      if (isNotFound(err)) return null;
      throw err;
    }
  }
}

function isNotFound(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    (err as { code?: unknown }).code === 'ENOENT'
  );
}
