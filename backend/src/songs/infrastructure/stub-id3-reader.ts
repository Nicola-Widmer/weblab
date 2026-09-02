import { Injectable } from '@nestjs/common';
import { Id3Tags } from '../domain/id3-tags';
import { Id3Reader } from '../application/id3-reader';

/**
 * Stand-in: returns no tags, so uploads fall back to the filename for the title
 * and to the `AudioProbe` for the duration. Replace with a real parser
 * (`music-metadata`) alongside the upload endpoint.
 */
@Injectable()
export class StubId3Reader extends Id3Reader {
  read(_bytes: Buffer): Promise<Id3Tags> {
    return Promise.resolve({});
  }
}
