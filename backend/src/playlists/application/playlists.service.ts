import { Injectable, NotFoundException } from '@nestjs/common';
import { Clock } from '../../shared/application/clock';
import { IdGenerator } from '../../shared/application/id-generator';
import { Uuid } from '../../shared/domain/uuid';
import { Playlist } from '../domain/playlist';
import { PlaylistRepository } from './playlist-repository';

/** Use cases of the `playlists` context. */
@Injectable()
export class PlaylistsService {
  constructor(
    private readonly playlists: PlaylistRepository,
    private readonly ids: IdGenerator,
    private readonly clock: Clock,
  ) {}

  list(ownerId: Uuid): Promise<Playlist[]> {
    return this.playlists.listByOwner(ownerId);
  }

  async get(ownerId: Uuid, id: Uuid): Promise<Playlist> {
    const playlist = await this.playlists.byId(id, ownerId);
    if (!playlist) throw new NotFoundException('Playlist not found');
    return playlist;
  }

  async create(ownerId: Uuid, name: string): Promise<Playlist> {
    const playlist = Playlist.create(
      this.ids.next(),
      ownerId,
      name,
      this.clock.now(),
    );
    await this.playlists.save(playlist);
    return playlist;
  }

  async rename(ownerId: Uuid, id: Uuid, name: string): Promise<Playlist> {
    const playlist = await this.get(ownerId, id);
    playlist.rename(name);
    await this.playlists.save(playlist);
    return playlist;
  }

  async addSong(ownerId: Uuid, id: Uuid, songId: Uuid): Promise<Playlist> {
    const playlist = await this.get(ownerId, id);
    playlist.addSong(songId, this.ids.next());
    await this.playlists.save(playlist);
    return playlist;
  }

  async removeEntry(ownerId: Uuid, id: Uuid, entryId: Uuid): Promise<Playlist> {
    const playlist = await this.get(ownerId, id);
    playlist.removeEntry(entryId);
    await this.playlists.save(playlist);
    return playlist;
  }

  async reorder(
    ownerId: Uuid,
    id: Uuid,
    orderedEntryIds: Uuid[],
  ): Promise<Playlist> {
    const playlist = await this.get(ownerId, id);
    playlist.reorder(orderedEntryIds);
    await this.playlists.save(playlist);
    return playlist;
  }

  async remove(ownerId: Uuid, id: Uuid): Promise<void> {
    await this.get(ownerId, id); // 404 if not the owner's
    await this.playlists.remove(id);
  }

  /**
   * React to a deleted song: drop every occurrence from every playlist that held
   * it. Idempotent — safe to re-run from the reconciliation sweep.
   */
  async dropSongEverywhere(songId: Uuid): Promise<void> {
    for (const playlist of await this.playlists.containingSong(songId)) {
      playlist.removeAllOccurrences(songId);
      await this.playlists.save(playlist);
    }
  }
}
