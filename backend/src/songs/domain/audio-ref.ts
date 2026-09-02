/**
 * Where a song's audio bytes live and what they are. Value object — bundles the
 * opaque storage key with its size and content type (ADR-0004). Immutable once a
 * song exists ("the audio file is never modified", SNG-1).
 */
export class AudioRef {
  constructor(
    readonly storageKey: string,
    readonly sizeBytes: number,
    readonly contentType: string,
  ) {}
}
