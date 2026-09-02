import { Readable } from 'node:stream';
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
 * Stand-in used when `STORAGE_DRIVER` is unset (tests, `pnpm openapi`). Same
 * observable behavior as `LocalFileStorage` — inclusive ranges, EOF clamping,
 * 416 on an unsatisfiable range — so the two share a test suite.
 */
@Injectable()
export class InMemoryFileStorage extends FileStorage {
  private blobs = new Map<string, Buffer>();

  put(key: string, data: Buffer, _contentType: string): Promise<void> {
    this.blobs.set(key, data);
    return Promise.resolve();
  }

  async getRange(key: string, range?: ByteRange): Promise<RangeResult> {
    const data = this.blobs.get(key);
    if (!data) throw new NotFoundException('Object not found');
    const totalSize = data.length;

    if (!range) {
      return { stream: Readable.from(data), contentLength: totalSize, totalSize };
    }

    // HTTP byte positions are 0-indexed and inclusive on both ends, so the last
    // valid position is `totalSize - 1`; an open (`bytes=10-`) or over-long
    // (`bytes=10-999`) range ends there.
    const start = range.start;
    const end = Math.min(range.end ?? totalSize - 1, totalSize - 1);
    if (start < 0 || start > end) {
      throw new HttpException(
        'Requested range not satisfiable',
        HttpStatus.REQUESTED_RANGE_NOT_SATISFIABLE,
      );
    }
    // `subarray` end is exclusive, so `+ 1` to include position `end`; the slice
    // length is then `end - start + 1` (e.g. 4..9 is 6 bytes).
    const slice = data.subarray(start, end + 1);
    return { stream: Readable.from(slice), contentLength: slice.length, totalSize };
  }

  delete(key: string): Promise<void> {
    this.blobs.delete(key);
    return Promise.resolve();
  }

  stat(key: string): Promise<{ sizeBytes: number } | null> {
    const data = this.blobs.get(key);
    return Promise.resolve(data ? { sizeBytes: data.length } : null);
  }
}
