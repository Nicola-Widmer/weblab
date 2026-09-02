-- Seed fixtures for AUTH_ENABLED=false / demo runs. Mirrors the in-memory
-- adapters (identity/songs/playlists infrastructure) so `docker compose up` and
-- DB-backed tests start from the same data. `ON CONFLICT DO NOTHING` keeps it
-- safe to re-run. Audio storage keys point at objects that do not exist (same
-- as the in-memory seeds) — streaming a seed song 404s either way.

INSERT INTO "users" ("id", "email", "password_hash", "created_at") VALUES
  ('9f1b2c3d-0000-4000-8000-000000000001', 'ada@example.com', 'stub$cGFzc3dvcmQ=', '2026-01-01T00:00:00.000Z')
ON CONFLICT DO NOTHING;
--> statement-breakpoint
INSERT INTO "songs" (
  "id", "owner_id", "title", "artist", "album", "duration_seconds",
  "audio_storage_key", "audio_size_bytes", "audio_content_type",
  "cover_storage_key", "cover_content_type", "cover_size_bytes", "added_at"
) VALUES
  ('11111111-2222-4333-8444-555555555551', '9f1b2c3d-0000-4000-8000-000000000001',
   'Clair de Lune', 'Claude Debussy', NULL, 300,
   'seed-audio-11111111-2222-4333-8444-555555555551', 4000000, 'audio/mpeg',
   NULL, NULL, NULL, '2026-01-02T00:00:00.000Z'),
  ('11111111-2222-4333-8444-555555555552', '9f1b2c3d-0000-4000-8000-000000000001',
   'Gymnopédie No. 1', 'Erik Satie', NULL, 210,
   'seed-audio-11111111-2222-4333-8444-555555555552', 4000000, 'audio/mpeg',
   NULL, NULL, NULL, '2026-01-03T00:00:00.000Z')
ON CONFLICT DO NOTHING;
--> statement-breakpoint
INSERT INTO "playlists" ("id", "owner_id", "name", "created_at") VALUES
  ('a1111111-2222-4333-8444-555555555551', '9f1b2c3d-0000-4000-8000-000000000001', 'Focus', '2026-01-05T00:00:00.000Z'),
  ('a1111111-2222-4333-8444-555555555552', '9f1b2c3d-0000-4000-8000-000000000001', 'Piano', '2026-01-05T00:00:00.000Z')
ON CONFLICT DO NOTHING;
--> statement-breakpoint
INSERT INTO "playlist_entries" ("id", "playlist_id", "song_id", "position") VALUES
  ('10000000-0000-4000-8000-000000000001', 'a1111111-2222-4333-8444-555555555551', '11111111-2222-4333-8444-555555555551', 0),
  ('10000000-0000-4000-8000-000000000002', 'a1111111-2222-4333-8444-555555555551', '11111111-2222-4333-8444-555555555552', 1),
  ('10000000-0000-4000-8000-000000000003', 'a1111111-2222-4333-8444-555555555552', '11111111-2222-4333-8444-555555555552', 0),
  ('10000000-0000-4000-8000-000000000004', 'a1111111-2222-4333-8444-555555555552', '11111111-2222-4333-8444-555555555552', 1)
ON CONFLICT DO NOTHING;
