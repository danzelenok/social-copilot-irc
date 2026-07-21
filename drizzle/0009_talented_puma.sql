CREATE TYPE "public"."post_type" AS ENUM('post', 'story');--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "post_type" "post_type" DEFAULT 'post' NOT NULL;