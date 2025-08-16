CREATE TABLE "entity" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"namespace" text NOT NULL,
	"entity_type_id" uuid,
	"entity_type_version" integer NOT NULL,
	"data" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "entity_type" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"namespace" text NOT NULL,
	"name" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"schema_json" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "entity" ADD CONSTRAINT "entity_entity_type_id_entity_type_id_fk" FOREIGN KEY ("entity_type_id") REFERENCES "public"."entity_type"("id") ON DELETE no action ON UPDATE no action;