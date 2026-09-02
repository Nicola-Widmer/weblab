import type { Readable } from 'node:stream';

export interface ByteRange {
  start: number;
  end?: number;
}

export interface RangeResult {
  stream: Readable;
  contentLength: number;
  totalSize: number;
  contentType: string;
}

/**
 * Port: opaque blob storage for audio and cover objects (ADR-0004). The default
 * adapter is the local filesystem; an S3 one is selected by configuration. The
 * in-memory build keeps bytes in a `Map`.
 */
export abstract class FileStorage {
  abstract put(key: string, data: Buffer, contentType: string): Promise<void>;
  abstract getRange(key: string, range?: ByteRange): Promise<RangeResult>;
  abstract delete(key: string): Promise<void>;
  abstract stat(
    key: string,
  ): Promise<{ sizeBytes: number; contentType: string } | null>;
}
