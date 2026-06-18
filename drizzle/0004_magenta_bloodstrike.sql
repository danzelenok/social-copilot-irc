ALTER TABLE "posts" ALTER COLUMN "media_type" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."media_type";--> statement-breakpoint
CREATE TYPE "public"."media_type" AS ENUM('photo', 'video');--> statement-breakpoint
ALTER TABLE "posts" ALTER COLUMN "media_type" SET DATA TYPE "public"."media_type" USING "media_type"::"public"."media_type";--> statement-breakpoint
ALTER TABLE "branches" DROP COLUMN "canva_template_id";