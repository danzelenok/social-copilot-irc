ALTER TYPE "public"."post_status" ADD VALUE 'scheduled';--> statement-breakpoint
ALTER TYPE "public"."post_status" ADD VALUE 'cancelled';--> statement-breakpoint
ALTER TYPE "public"."post_target_status" ADD VALUE 'scheduled';--> statement-breakpoint
ALTER TYPE "public"."post_target_status" ADD VALUE 'cancelled';--> statement-breakpoint
ALTER TABLE "branches" ADD COLUMN "timezone" text;--> statement-breakpoint
ALTER TABLE "post_targets" ADD COLUMN "event_at" timestamp;--> statement-breakpoint
ALTER TABLE "post_targets" ADD COLUMN "schedule_id" uuid;--> statement-breakpoint
ALTER TABLE "posts" DROP COLUMN "event_at";