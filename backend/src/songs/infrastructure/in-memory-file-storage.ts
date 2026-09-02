import { Readable } from 'node:stream';
import { Injectable } from '@nestjs/common';
import { NotFoundException } from '@nestjs/common';
import {
  FileStorage,
  type ByteRange,
  type RangeResult,
} from '../application/file-storage';

/** Stand-in until the local-filesystem / S3 adapters land (ADR-0004). */
@Injectable()
export class InMemoryFileStorage extends FileStorage {
  private blobs = new Map<string, { data: Buffer; contentType: string }>();

  put(key: string, data: Buffer, contentType: string): Promise<void> {
    this.blobs.set(key, { data, contentType });
    return Promise.resolve();
  }

  getRange(key: string, range?: ByteRange): Promise<RangeResult> {
    const blob = this.blobs.get(key);
    if (!blob) throw new NotFoundException('Object not found');
    const start = range?.start ?? 0;
    const end = Math.min(range?.end ?? blob.data.length - 1, blob.data.length - 1);
    const slice = blob.data.subarray(start, end + 1);
    return Promise.resolve({
      stream: Readable.from(slice),
      contentLength: slice.length,
      totalSize: blob.data.length,
      contentType: blob.contentType,
    });
  }

  delete(key: string): Promise<void> {
    this.blobs.delete(key);
    return Promise.resolve();
  }

  stat(key: string): Promise<{ sizeBytes: number; contentType: string } | null> {
    const blob = this.blobs.get(key);
    return Promise.resolve(
      blob ? { sizeBytes: blob.data.length, contentType: blob.contentType } : null,
    );
  }
}
