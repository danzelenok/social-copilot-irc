CREATE TABLE IF NOT EXISTS "organizations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clerk_org_id" text NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "organizations_clerk_org_id_unique" UNIQUE("clerk_org_id")
);

-- Ensure a default organization exists to migrate any pre-existing branches
INSERT INTO "organizations" ("id", "clerk_org_id", "name")
VALUES ('00000000-0000-0000-0000-000000000000', 'clerk_org_default', 'Default Organization')
ON CONFLICT ("clerk_org_id") DO NOTHING;

-- Add organization_id column to branches as nullable initially
ALTER TABLE "branches" ADD COLUMN IF NOT EXISTS "organization_id" uuid;

-- Migrate existing branches to the default organization
UPDATE "branches" SET "organization_id" = '00000000-0000-0000-0000-000000000000' WHERE "organization_id" IS NULL;

-- Enforce NOT NULL and foreign key constraint
ALTER TABLE "branches" ALTER COLUMN "organization_id" SET NOT NULL;

DO $$ BEGIN
 ALTER TABLE "branches" ADD CONSTRAINT "branches_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- Create ai_style_settings table
CREATE TABLE IF NOT EXISTS "ai_style_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"style_prompt" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);

DO $$ BEGIN
 ALTER TABLE "ai_style_settings" ADD CONSTRAINT "ai_style_settings_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
