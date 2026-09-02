import { Inject, Injectable } from '@nestjs/common';
import { and, asc, desc, eq } from 'drizzle-orm';
import type { Db } from '../../shared/db/client';
import { DB } from '../../shared/db/database.module';
import {
  songs as songsTable,
  type NewSongRow,
  type SongRow,
} from '../../shared/db/schema';
import { asUuid, type Uuid } from '../../shared/domain/uuid';
import { SongRepository, type SongSort } from '../application/song-repository';
import { AudioRef } from '../domain/audio-ref';
import { CoverArtRef } from '../domain/cover-art-ref';
import { Song } from '../domain/song';

/** Drizzle / PostgreSQL adapter for `SongRepository` (ADR-0004). */
@Injectable()
export class DrizzleSongRepository extends SongRepository {
  constructor(@Inject(DB) private readonly db: Db) {
    super();
  }

  async save(song: Song): Promise<void> {
    const row = toRow(song);
    await this.db
      .insert(songsTable)
      .values(row)
      .onConflictDoUpdate({ target: songsTable.id, set: row });
  }

  async byId(id: Uuid, ownerId: Uuid): Promise<Song | undefined> {
    const [row] = await this.db
      .select()
      .from(songsTable)
      .where(and(eq(songsTable.id, id), eq(songsTable.ownerId, ownerId)));
    return row ? toDomain(row) : undefined;
  }

  async listByOwner(ownerId: Uuid, sort: SongSort): Promise<Song[]> {
    const orderBy =
      sort === 'title'
        ? asc(songsTable.title)
        : sort === 'artist'
          ? asc(songsTable.artist)
          : desc(songsTable.addedAt); // dateAdded: newest first
    const rows = await this.db
      .select()
      .from(songsTable)
      .where(eq(songsTable.ownerId, ownerId))
      .orderBy(orderBy);
    return rows.map(toDomain);
  }

  async remove(id: Uuid): Promise<void> {
    await this.db.delete(songsTable).where(eq(songsTable.id, id));
  }
}

function toRow(song: Song): NewSongRow {
  return {
    id: song.id,
    ownerId: song.ownerId,
    title: song.title,
    artist: song.artist ?? null,
    album: song.album ?? null,
    durationSeconds: song.duration,
    audioStorageKey: song.audio.storageKey,
    audioSizeBytes: song.audio.sizeBytes,
    audioContentType: song.audio.contentType,
    coverStorageKey: song.coverArt?.storageKey ?? null,
    coverContentType: song.coverArt?.contentType ?? null,
    coverSizeBytes: song.coverArt?.sizeBytes ?? null,
    addedAt: song.addedAt,
  };
}

function toDomain(row: SongRow): Song {
  const cover =
    row.coverStorageKey && row.coverContentType && row.coverSizeBytes != null
      ? new CoverArtRef(
          row.coverStorageKey,
          row.coverContentType,
          row.coverSizeBytes,
        )
      : undefined;
  return new Song(
    asUuid(row.id),
    asUuid(row.ownerId),
    row.title,
    row.artist ?? undefined,
    row.album ?? undefined,
    row.durationSeconds,
    new AudioRef(row.audioStorageKey, row.audioSizeBytes, row.audioContentType),
    cover,
    row.addedAt,
  );
}
