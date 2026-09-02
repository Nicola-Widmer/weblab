import { Uuid } from '../../shared/domain/uuid';
import { PlaylistEntry } from './playlist-entry';

/**
 * A named, ordered list of songs. Aggregate root of the `playlists` context.
 * Duplicates of a `songId` are allowed; each occurrence is its own
 * `PlaylistEntry`. The root keeps `position` contiguous and guards that a
 * `reorder` is a true permutation of the current entries.
 */
export class Playlist {
  constructor(
    readonly id: Uuid,
    readonly ownerId: Uuid,
    public name: string,
    private _entries: PlaylistEntry[],
    readonly createdAt: Date,
  ) {
    this.repack();
  }

  get entries(): readonly PlaylistEntry[] {
    return this._entries;
  }

  static create(id: Uuid, ownerId: Uuid, name: string, now: Date): Playlist {
    return new Playlist(id, ownerId, requireName(name), [], now);
  }

  rename(name: string): void {
    this.name = requireName(name);
  }

  /** Append a new occurrence of `songId` at the end. Never a no-op. */
  addSong(songId: Uuid, entryId: Uuid): Uuid {
    this._entries.push(new PlaylistEntry(entryId, songId, this._entries.length));
    return entryId;
  }

  /** Remove one occurrence, keeping the order of the rest (PL-1). */
  removeEntry(entryId: Uuid): void {
    this._entries = this._entries.filter((e) => e.id !== entryId);
    this.repack();
  }

  /** Drop every occurrence of a song. Used only by the `SongDeleted` handler. */
  removeAllOccurrences(songId: Uuid): void {
    this._entries = this._entries.filter((e) => e.songId !== songId);
    this.repack();
  }

  /** Reorder to `orderedEntryIds`, which must be a permutation of the current set. */
  reorder(orderedEntryIds: Uuid[]): void {
    const current = new Set(this._entries.map((e) => e.id));
    const wanted = new Set(orderedEntryIds);
    const samePermutation =
      current.size === wanted.size &&
      orderedEntryIds.length === this._entries.length &&
      orderedEntryIds.every((id) => current.has(id));
    if (!samePermutation) {
      throw new Error('reorder must be a permutation of the current entries');
    }
    const byId = new Map(this._entries.map((e) => [e.id, e]));
    this._entries = orderedEntryIds.map((id) => byId.get(id)!);
    this.repack();
  }

  private repack(): void {
    this._entries.forEach((entry, index) => {
      entry.position = index;
    });
  }
}

function requireName(name: string): string {
  const trimmed = name.trim();
  if (trimmed.length === 0) throw new Error('Playlist name must not be empty');
  return trimmed;
}
