CREATE TABLE "process_definition" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"namespace" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"version" integer DEFAULT 1 NOT NULL,
	"steps" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"created_by" text
);
--> statement-breakpoint
CREATE TABLE "process_instance" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"process_def_id" uuid NOT NULL,
	"namespace" text NOT NULL,
	"status" text DEFAULT 'running' NOT NULL,
	"current_step" text,
	"current_step_index" integer DEFAULT 0 NOT NULL,
	"context" jsonb DEFAULT '{}' NOT NULL,
	"completed_steps" jsonb DEFAULT '[]' NOT NULL,
	"assignees" jsonb DEFAULT '[]' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"completed_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "process_instance" ADD CONSTRAINT "process_instance_process_def_id_process_definition_id_fk" FOREIGN KEY ("process_def_id") REFERENCES "public"."process_definition"("id") ON DELETE no action ON UPDATE no action;