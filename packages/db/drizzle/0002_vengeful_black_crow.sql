ALTER TABLE "user" DROP CONSTRAINT "user_username_unique";--> statement-breakpoint
ALTER TABLE "user" DROP CONSTRAINT "user_email_unique";--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "group_members" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "groups" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "feature_flags" text[] DEFAULT '{}'::text[] NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
CREATE INDEX "idx_events_deleted_at" ON "events" USING btree ("deleted_at") WHERE deleted_at IS NOT NULL;--> statement-breakpoint
CREATE INDEX "idx_group_members_deleted_at" ON "group_members" USING btree ("deleted_at") WHERE deleted_at IS NOT NULL;--> statement-breakpoint
CREATE INDEX "idx_groups_deleted_at" ON "groups" USING btree ("deleted_at") WHERE deleted_at IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "user_email_unique_active" ON "user" USING btree ("email") WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "user_username_unique_active" ON "user" USING btree ("username") WHERE deleted_at IS NULL AND username IS NOT NULL;--> statement-breakpoint
CREATE INDEX "idx_user_deleted_at" ON "user" USING btree ("deleted_at") WHERE deleted_at IS NOT NULL;