ALTER TABLE "sessions" ADD COLUMN "access_token" text NOT NULL;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "refresh_token" text NOT NULL;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "access_token_expires_at" timestamp with time zone NOT NULL;