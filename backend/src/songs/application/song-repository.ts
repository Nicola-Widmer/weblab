import { Uuid } from '../../shared/domain/uuid';
import { Song } from '../domain/song';

export type SongSort = 'title' | 'artist' | 'dateAdded';

/** Port: how the application layer loads and stores songs. Owner-scoped reads. */
export abstract class SongRepository {
  abstract save(song: Song): Promise<void>;
  abstract byId(id: Uuid, ownerId: Uuid): Promise<Song | undefined>;
  abstract listByOwner(ownerId: Uuid, sort: SongSort): Promise<Song[]>;
  abstract remove(id: Uuid): Promise<void>;
}
