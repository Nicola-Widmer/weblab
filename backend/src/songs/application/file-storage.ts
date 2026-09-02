import type { Readable } from 'node:stream';

export interface ByteRange {
  start: number;
  end?: number;
}

export interface RangeResult {
  stream: Readable;
  contentLength: number;
  totalSize: number;
}

/**
 * Port: opaque blob storage for audio and cover objects (ADR-0004). The default
 * adapter is the local filesystem; an S3 one is selected by configuration; the
 * in-memory build keeps bytes in a `Map`.
 *
 * Storage moves bytes only — the MIME type of a stored object is owned by the
 * `Song` aggregate (`audio.contentType` / `coverArt.contentType`), so reads do
 * not report it. `put` still takes it so an adapter with native object metadata
 * (S3 `Content-Type`) can record it for direct/pre-signed access.
 */
export abstract class FileStorage {
  abstract put(key: string, data: Buffer, contentType: string): Promise<void>;
  abstract getRange(key: string, range?: ByteRange): Promise<RangeResult>;
  abstract delete(key: string): Promise<void>;
  abstract stat(key: string): Promise<{ sizeBytes: number } | null>;
}
