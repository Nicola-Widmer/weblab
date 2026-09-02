import { Id3Tags } from '../domain/id3-tags';

/** Port: extract ID3 tags from MP3 bytes. */
export abstract class Id3Reader {
  abstract read(bytes: Buffer): Promise<Id3Tags>;
}
