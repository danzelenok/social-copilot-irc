CREATE TYPE "public"."media_type" AS ENUM('photo_canva', 'photo_direct', 'video');--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "media_url" text;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "media_type" "media_type";