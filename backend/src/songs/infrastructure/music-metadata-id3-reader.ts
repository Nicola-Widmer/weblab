import { Injectable } from '@nestjs/common';
import { parseBuffer } from 'music-metadata';
import { Id3Reader } from '../application/id3-reader';
import { Id3Tags } from '../domain/id3-tags';

/**
 * Real tag + duration extraction via `music-metadata` (v7 — the last CommonJS
 * release; the backend is CJS). An unparseable file yields empty tags; the
 * caller then falls back to the filename for the title and rejects the upload
 * because there is no duration.
 */
@Injectable()
export class MusicMetadataId3Reader extends Id3Reader {
  async read(bytes: Buffer): Promise<Id3Tags> {
    try {
      const { common, format } = await parseBuffer(
        bytes,
        { mimeType: 'audio/mpeg' },
        { duration: true },
      );
      const cover = common.picture?.[0];
      return {
        title: nonEmpty(common.title),
        artist: nonEmpty(common.artist),
        album: nonEmpty(common.album),
        durationSeconds:
          typeof format.duration === 'number'
            ? Math.round(format.duration)
            : undefined,
        coverBytes: cover?.data ? Buffer.from(cover.data) : undefined,
        coverMimeType: cover?.data ? cover.format : undefined,
      };
    } catch {
      return {};
    }
  }
}

function nonEmpty(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}
