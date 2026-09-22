import { Inject, Injectable } from '@nestjs/common';
import { eq, notInArray } from 'drizzle-orm';
import type { Db } from '../../shared/db/client';
import { DB } from '../../shared/db/database.module';
import {
  playlistEntries as entriesTable,
  playlists as playlistsTable,
  songs as songsTable,
  type PlaylistEntryRow,
  type PlaylistRow,
} from '../../shared/db/schema';
import { asUuid, type Uuid } from '../../shared/domain/uuid';
import { PlaylistRepository } from '../application/playlist-repository';
import { Playlist } from '../domain/playlist';
import { PlaylistEntry } from '../domain/playlist-entry';

type PlaylistWithEntries = PlaylistRow & { entries: PlaylistEntryRow[] };

/** Drizzle / PostgreSQL adapter for `PlaylistRepository` (ADR-0004). */
@Injectable()
export class DrizzlePlaylistRepository extends PlaylistRepository {
  constructor(@Inject(DB) private readonly db: Db) {
    super();
  }

  /**
   * Replace the whole aggregate in one transaction: upsert the row, then swap
   * out all entry rows. Playlists are small and entries carry no external
   * references, so a delete-and-reinsert is simpler than diffing and just as
   * correct.
   */
  async save(playlist: Playlist): Promise<void> {
    await this.db.transaction(async (tx) => {
      await tx
        .insert(playlistsTable)
        .values({
          id: playlist.id,
          ownerId: playlist.ownerId,
          name: playlist.name,
          createdAt: playlist.createdAt,
        })
        .onConflictDoUpdate({
          target: playlistsTable.id,
          set: { name: playlist.name },
        });

      await tx.delete(entriesTable).where(eq(entriesTable.playlistId, playlist.id));

      if (playlist.entries.length > 0) {
        await tx.insert(entriesTable).values(
          playlist.entries.map((e) => ({
            id: e.id,
            playlistId: playlist.id,
            songId: e.songId,
            position: e.position,
          })),
        );
      }
    });
  }

  async byId(id: Uuid, ownerId: Uuid): Promise<Playlist | undefined> {
    const row = await this.db.query.playlists.findFirst({
      where: (p, { and, eq: equals }) =>
        and(equals(p.id, id), equals(p.ownerId, ownerId)),
      with: { entries: { orderBy: (e, { asc }) => asc(e.position) } },
    });
    return row ? toDomain(row) : undefined;
  }

  async listByOwner(ownerId: Uuid): Promise<Playlist[]> {
    const rows = await this.db.query.playlists.findMany({
      where: (p, { eq: equals }) => equals(p.ownerId, ownerId),
      with: { entries: { orderBy: (e, { asc }) => asc(e.position) } },
    });
    return rows.map(toDomain);
  }

  async remove(id: Uuid): Promise<void> {
    // playlist_entries rows go with it via ON DELETE CASCADE.
    await this.db.delete(playlistsTable).where(eq(playlistsTable.id, id));
  }

  async removeSongEverywhere(songId: Uuid): Promise<void> {
    await this.db.delete(entriesTable).where(eq(entriesTable.songId, songId));
  }

  async removeOrphanedEntries(): Promise<void> {
    await this.db.delete(entriesTable).where(
      notInArray(
        entriesTable.songId,
        this.db.select({ id: songsTable.id }).from(songsTable),
      ),
    );
  }
}

function toDomain(row: PlaylistWithEntries): Playlist {
  const entries = row.entries.map(
    (e) => new PlaylistEntry(asUuid(e.id), asUuid(e.songId), e.position),
  );
  return new Playlist(
    asUuid(row.id),
    asUuid(row.ownerId),
    row.name,
    entries,
    row.createdAt,
  );
}
