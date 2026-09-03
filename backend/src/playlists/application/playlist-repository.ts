import { Uuid } from '../../shared/domain/uuid';
import { Playlist } from '../domain/playlist';

/** Port: how the application layer loads and stores playlists. */
export abstract class PlaylistRepository {
  abstract save(playlist: Playlist): Promise<void>;
  abstract byId(id: Uuid, ownerId: Uuid): Promise<Playlist | undefined>;
  abstract listByOwner(ownerId: Uuid): Promise<Playlist[]>;
  abstract remove(id: Uuid): Promise<void>;
  /**
   * Every playlist that currently contains the song. Not owner-scoped: it serves
   * the `SongDeleted` reaction, not a user request.
   */
  abstract containingSong(songId: Uuid): Promise<Playlist[]>;
}
