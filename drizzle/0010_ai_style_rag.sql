CREATE EXTENSION IF NOT EXISTS vector;--> statement-breakpoint
ALTER TABLE "ai_style_settings" RENAME COLUMN "style_prompt" TO "custom_prompt";--> statement-breakpoint
ALTER TABLE "ai_style_settings" ADD COLUMN "style_examples_enabled" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "ai_style_settings" ADD COLUMN "use_instagram_history_for_style" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "embedding" vector(1536);--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "is_style_example" boolean DEFAULT false NOT NULL;
