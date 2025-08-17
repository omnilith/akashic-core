CREATE TABLE "relation" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"namespace" text NOT NULL,
	"relation_type_id" uuid NOT NULL,
	"from_entity_id" uuid NOT NULL,
	"to_entity_id" uuid NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "relation_type" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"namespace" text NOT NULL,
	"name" text NOT NULL,
	"from_entity_type_id" uuid NOT NULL,
	"to_entity_type_id" uuid NOT NULL,
	"cardinality" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "relation" ADD CONSTRAINT "relation_relation_type_id_relation_type_id_fk" FOREIGN KEY ("relation_type_id") REFERENCES "public"."relation_type"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "relation" ADD CONSTRAINT "relation_from_entity_id_entity_id_fk" FOREIGN KEY ("from_entity_id") REFERENCES "public"."entity"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "relation" ADD CONSTRAINT "relation_to_entity_id_entity_id_fk" FOREIGN KEY ("to_entity_id") REFERENCES "public"."entity"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "relation_type" ADD CONSTRAINT "relation_type_from_entity_type_id_entity_type_id_fk" FOREIGN KEY ("from_entity_type_id") REFERENCES "public"."entity_type"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "relation_type" ADD CONSTRAINT "relation_type_to_entity_type_id_entity_type_id_fk" FOREIGN KEY ("to_entity_type_id") REFERENCES "public"."entity_type"("id") ON DELETE no action ON UPDATE no action;