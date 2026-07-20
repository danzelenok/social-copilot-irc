CREATE TABLE "branch_addresses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"branch_id" uuid NOT NULL,
	"label" text NOT NULL,
	"address_text" text NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "posts" ALTER COLUMN "event_at" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "post_targets" ADD COLUMN "address" text;--> statement-breakpoint
ALTER TABLE "branch_addresses" ADD CONSTRAINT "branch_addresses_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE cascade ON UPDATE no action;