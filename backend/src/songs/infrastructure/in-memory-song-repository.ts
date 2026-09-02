import { Injectable } from '@nestjs/common';
import { LOCAL_USER_ID } from '../../shared/domain/local-user';
import { asUuid, Uuid } from '../../shared/domain/uuid';
import { AudioRef } from '../domain/audio-ref';
import { Song } from '../domain/song';
import { SongRepository, type SongSort } from '../application/song-repository';

// Seed ids are also referenced by the seed playlists (kept in sync by hand).
export const SEED_SONG_A = asUuid('11111111-2222-4333-8444-555555555551');
export const SEED_SONG_B = asUuid('11111111-2222-4333-8444-555555555552');

/** Stand-in until a Drizzle-backed adapter lands (ADR-0004). Seeded with fixtures. */
@Injectable()
export class InMemorySongRepository extends SongRepository {
  private songs = new Map<Uuid, Song>([
    seed(SEED_SONG_A, 'Clair de Lune', 'Claude Debussy', 300, '2026-01-02'),
    seed(SEED_SONG_B, 'Gymnopédie No. 1', 'Erik Satie', 210, '2026-01-03'),
  ]);

  save(song: Song): Promise<void> {
    this.songs.set(song.id, song);
    return Promise.resolve();
  }

  byId(id: Uuid, ownerId: Uuid): Promise<Song | undefined> {
    const song = this.songs.get(id);
    return Promise.resolve(song && song.ownerId === ownerId ? song : undefined);
  }

  listByOwner(ownerId: Uuid, sort: SongSort): Promise<Song[]> {
    const mine = [...this.songs.values()].filter((s) => s.ownerId === ownerId);
    mine.sort((a, b) => {
      if (sort === 'title') return a.title.localeCompare(b.title);
      if (sort === 'artist') return (a.artist ?? '').localeCompare(b.artist ?? '');
      return b.addedAt.getTime() - a.addedAt.getTime(); // dateAdded: newest first
    });
    return Promise.resolve(mine);
  }

  remove(id: Uuid): Promise<void> {
    this.songs.delete(id);
    return Promise.resolve();
  }
}

function seed(
  id: Uuid,
  title: string,
  artist: string,
  duration: number,
  addedAt: string,
): [Uuid, Song] {
  const audio = new AudioRef(`seed-audio-${id}`, 4_000_000, 'audio/mpeg');
  return [
    id,
    new Song(id, LOCAL_USER_ID, title, artist, undefined, duration, audio, undefined, new Date(addedAt)),
  ];
}
