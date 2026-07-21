ALTER TABLE "post_targets" ADD COLUMN "platform_message_id" text;--> statement-breakpoint
ALTER TABLE "post_targets" ADD COLUMN "hidden_from_calendar" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "post_targets" ADD COLUMN "hidden_at" timestamp;