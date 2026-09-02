import { Injectable } from '@nestjs/common';
import { AudioProbe } from '../application/audio-probe';

/** Stand-in: reports `0` seconds. Replace with a real decoder probe. */
@Injectable()
export class StubAudioProbe extends AudioProbe {
  durationSeconds(_bytes: Buffer): Promise<number> {
    return Promise.resolve(0);
  }
}
