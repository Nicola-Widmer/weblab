import { relations } from 'drizzle-orm';
import {
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';

/**
 * All tables for the Web Music Player (ADR-0004 — metadata in PostgreSQL).
 * Column names are snake_case (drizzle-kit `casing: 'snake_case'`).
 *
 * Only the `songs` context has a Drizzle repository so far; `identity` and
 * `playlists` still use in-memory adapters. The tables are defined ahead of
 * their repositories so one migration covers the whole model.
 *
 * Foreign keys: real constraints wherever both tables exist and the reference
 * is intra-aggregate or to the shared `users` identity. The one exception is
 * `playlist_entries.song_id` — a cross-context reference that is allowed to
 * dangle briefly; `RemoveDeletedSongFromPlaylists` (the `SongDeleted` handler)
 * plus a reconciliation sweep clean it up (ADR-0002).
 */

// ── identity ────────────────────────────────────────────────────────────────

export const users = pgTable('users', {
  id: uuid('id').primaryKey(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
});

export const sessions = pgTable(
  'sessions',
  {
    id: uuid('id').primaryKey(), // opaque; the cookie value
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  },
  (t) => [
    index('sessions_user_id_idx').on(t.userId),
    index('sessions_expires_at_idx').on(t.expiresAt), // deleteExpired sweep
  ],
);

// ── songs ───────────────────────────────────────────────────────────────────

export const songs = pgTable(
  'songs',
  {
    id: uuid('id').primaryKey(),
    ownerId: uuid('owner_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    artist: text('artist'),
    album: text('album'),
    durationSeconds: integer('duration_seconds').notNull(),

    // Audio bytes live behind FileStorage (ADR-0004); the row keeps only refs.
    audioStorageKey: text('audio_storage_key').notNull(),
    audioSizeBytes: integer('audio_size_bytes').notNull(),
    audioContentType: text('audio_content_type').notNull(),

    // Cover is a separate FileStorage object, nullable.
    coverStorageKey: text('cover_storage_key'),
    coverContentType: text('cover_content_type'),
    coverSizeBytes: integer('cover_size_bytes'),

    addedAt: timestamp('added_at', { withTimezone: true }).notNull(),
  },
  (t) => [index('songs_owner_id_idx').on(t.ownerId)],
);

// ── playlists ───────────────────────────────────────────────────────────────

export const playlists = pgTable(
  'playlists',
  {
    id: uuid('id').primaryKey(),
    ownerId: uuid('owner_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: text('name').notNull(), // duplicates allowed — no unique constraint
    createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
  },
  (t) => [index('playlists_owner_id_idx').on(t.ownerId)],
);

export const playlistEntries = pgTable(
  'playlist_entries',
  {
    id: uuid('id').primaryKey(), // local identity; what add/remove/reorder address
    playlistId: uuid('playlist_id')
      .notNull()
      .references(() => playlists.id, { onDelete: 'cascade' }),
    // Deliberately NO foreign key — see the file header. A song may appear more
    // than once, so there is also no unique on (playlist_id, song_id).
    songId: uuid('song_id').notNull(),
    // Contiguous 0..n-1, guarded by the Playlist aggregate, not a DB constraint
    // (an in-place reorder would trip a unique (playlist_id, position) index).
    position: integer('position').notNull(),
  },
  (t) => [
    index('playlist_entries_playlist_id_idx').on(t.playlistId),
    index('playlist_entries_song_id_idx').on(t.songId), // containingSong + sweep
  ],
);

// ── relations (query-layer only; no effect on the generated DDL) ─────────────

export const playlistsRelations = relations(playlists, ({ many }) => ({
  entries: many(playlistEntries),
}));

export const playlistEntriesRelations = relations(playlistEntries, ({ one }) => ({
  playlist: one(playlists, {
    fields: [playlistEntries.playlistId],
    references: [playlists.id],
  }),
}));

// ── row types & schema map ──────────────────────────────────────────────────

export type UserRow = typeof users.$inferSelect;
export type NewUserRow = typeof users.$inferInsert;
export type SessionRow = typeof sessions.$inferSelect;
export type NewSessionRow = typeof sessions.$inferInsert;
export type SongRow = typeof songs.$inferSelect;
export type NewSongRow = typeof songs.$inferInsert;
export type PlaylistRow = typeof playlists.$inferSelect;
export type NewPlaylistRow = typeof playlists.$inferInsert;
export type PlaylistEntryRow = typeof playlistEntries.$inferSelect;
export type NewPlaylistEntryRow = typeof playlistEntries.$inferInsert;

export const schema = {
  users,
  sessions,
  songs,
  playlists,
  playlistEntries,
  playlistsRelations,
  playlistEntriesRelations,
};
