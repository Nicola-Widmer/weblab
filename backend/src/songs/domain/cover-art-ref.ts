/**
 * Where a song's cover image lives. Value object — a *separate* `FileStorage`
 * object from the audio, not a database blob (ADR-0004). Optional on a song.
 */
export class CoverArtRef {
  constructor(
    readonly storageKey: string,
    readonly contentType: string,
    readonly sizeBytes: number,
  ) {}
}
