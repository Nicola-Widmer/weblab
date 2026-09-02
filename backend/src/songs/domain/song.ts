import { Uuid } from '../../shared/domain/uuid';
import { AudioRef } from './audio-ref';
import { CoverArtRef } from './cover-art-ref';
import { Id3Tags } from './id3-tags';

/** A track in a user's library. Aggregate root of the `songs` context. */
export class Song {
  constructor(
    readonly id: Uuid,
    readonly ownerId: Uuid,
    public title: string,
    public artist: string | undefined,
    public album: string | undefined,
    readonly duration: number, // whole seconds
    readonly audio: AudioRef,
    readonly coverArt: CoverArtRef | undefined,
    readonly addedAt: Date,
  ) {}

  /**
   * Factory for a freshly uploaded song. The bytes are already in storage; the
   * caller passes the resulting `AudioRef` / `CoverArtRef` and the parsed tags.
   * A missing or blank ID3 title falls back to the filename (SNG-1).
   */
  static upload(params: {
    id: Uuid;
    ownerId: Uuid;
    filename: string;
    id3: Id3Tags;
    durationSeconds: number;
    audio: AudioRef;
    cover?: CoverArtRef;
    now: Date;
  }): Song {
    const title =
      params.id3.title?.trim() || basename(params.filename);
    return new Song(
      params.id,
      params.ownerId,
      title,
      params.id3.artist?.trim() || undefined,
      params.id3.album?.trim() || undefined,
      Math.round(params.durationSeconds),
      params.audio,
      params.cover,
      params.now,
    );
  }

  /** Rename / retag. `title` stays required; duration, audio and cover are untouched. */
  editMetadata(patch: { title: string; artist?: string; album?: string }): void {
    const title = patch.title.trim();
    if (title.length === 0) throw new Error('Song title must not be empty');
    this.title = title;
    this.artist = patch.artist?.trim() || undefined;
    this.album = patch.album?.trim() || undefined;
  }
}

function basename(filename: string): string {
  return filename.replace(/\.[^.]+$/, '').split(/[/\\]/).pop() || filename;
}
