-- Pre-existing rows have no Keycloak tokens to backfill; dropping them just
-- forces a re-login rather than failing this migration outright on a
-- non-empty deployment (ADD COLUMN ... NOT NULL needs a default otherwise).
DELETE FROM "sessions";--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "access_token" text NOT NULL;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "refresh_token" text NOT NULL;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "access_token_expires_at" timestamp with time zone NOT NULL;