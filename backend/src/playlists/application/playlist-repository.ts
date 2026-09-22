import { Uuid } from '../../shared/domain/uuid';
import { Playlist } from '../domain/playlist';

/** Port: how the application layer loads and stores playlists. */
export abstract class PlaylistRepository {
  abstract save(playlist: Playlist): Promise<void>;
  abstract byId(id: Uuid, ownerId: Uuid): Promise<Playlist | undefined>;
  abstract listByOwner(ownerId: Uuid): Promise<Playlist[]>;
  abstract remove(id: Uuid): Promise<void>;
  /**
   * Delete every entry referencing `songId`, across every playlist, in one
   * statement — the `SongDeleted` reaction, without loading and re-saving each
   * affected playlist aggregate.
   */
  abstract removeSongEverywhere(songId: Uuid): Promise<void>;

  /**
   * Delete every entry whose song no longer exists. The reconciliation-sweep
   * backstop (ADR-0002) for a `SongDeleted` reaction that failed or was dropped.
   */
  abstract removeOrphanedEntries(): Promise<void>;
}
