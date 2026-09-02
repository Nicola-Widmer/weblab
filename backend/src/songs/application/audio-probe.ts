/** Port: measure a track's duration when ID3 does not carry it. */
export abstract class AudioProbe {
  abstract durationSeconds(bytes: Buffer): Promise<number>;
}
