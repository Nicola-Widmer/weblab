import 'reflect-metadata';
import { describe, expect, it } from 'vitest';
import { MusicMetadataId3Reader } from '../src/songs/infrastructure/music-metadata-id3-reader';

// ── minimal ID3v2.3 tag builders ────────────────────────────────────────────

function textFrame(id: string, text: string): Buffer {
  const content = Buffer.concat([Buffer.from([0x00]), Buffer.from(text, 'latin1')]);
  const size = Buffer.alloc(4);
  size.writeUInt32BE(content.length);
  return Buffer.concat([Buffer.from(id, 'latin1'), size, Buffer.from([0, 0]), content]);
}

function apicFrame(mime: string, data: Buffer): Buffer {
  const content = Buffer.concat([
    Buffer.from([0x00]), // text encoding
    Buffer.from(mime, 'latin1'),
    Buffer.from([0x00]), // MIME terminator
    Buffer.from([0x03]), // picture type: front cover
    Buffer.from([0x00]), // empty description + terminator
    data,
  ]);
  const size = Buffer.alloc(4);
  size.writeUInt32BE(content.length);
  return Buffer.concat([Buffer.from('APIC', 'latin1'), size, Buffer.from([0, 0]), content]);
}

function id3v2(...frames: Buffer[]): Buffer {
  const body = Buffer.concat(frames);
  const header = Buffer.alloc(10);
  header.write('ID3');
  header[3] = 3; // major version
  const n = body.length; // syncsafe size
  header[6] = (n >> 21) & 0x7f;
  header[7] = (n >> 14) & 0x7f;
  header[8] = (n >> 7) & 0x7f;
  header[9] = n & 0x7f;
  return Buffer.concat([header, body]);
}

// ── tests ───────────────────────────────────────────────────────────────────

const reader = new MusicMetadataId3Reader();

describe('MusicMetadataId3Reader', () => {
  it('extracts title / artist / album', async () => {
    const tags = await reader.read(
      id3v2(
        textFrame('TIT2', 'Clair de Lune'),
        textFrame('TPE1', 'Claude Debussy'),
        textFrame('TALB', 'Suite bergamasque'),
      ),
    );
    expect(tags).toMatchObject({
      title: 'Clair de Lune',
      artist: 'Claude Debussy',
      album: 'Suite bergamasque',
    });
  });

  it('extracts cover bytes and their MIME type', async () => {
    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 1, 2, 3, 4]);
    const tags = await reader.read(id3v2(apicFrame('image/png', png)));
    expect(tags.coverMimeType).toBe('image/png');
    expect(tags.coverBytes?.equals(png)).toBe(true);
  });

  it('maps blank tag values to undefined', async () => {
    const tags = await reader.read(id3v2(textFrame('TIT2', '   ')));
    expect(tags.title).toBeUndefined();
  });

  it('returns empty tags (no throw) on an unparseable buffer', async () => {
    await expect(
      reader.read(Buffer.from('ID3-not-actually-an-mp3-payload')),
    ).resolves.toEqual({});
  });
});
