CREATE TYPE "public"."milestone_status" AS ENUM('pending', 'completed', 'missed');--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" text PRIMARY KEY NOT NULL,
	"patient_id" text NOT NULL,
	"action" text NOT NULL,
	"success" integer NOT NULL,
	"details" jsonb,
	"timestamp" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "continuity_risk_scores" (
	"id" text PRIMARY KEY NOT NULL,
	"patient_id" text NOT NULL,
	"protocol_id" text NOT NULL,
	"risk_percentage" real NOT NULL,
	"risk_factors_json" jsonb NOT NULL,
	"suggested_intervention" text,
	"latency_days" integer,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "protocol_milestones" (
	"id" text PRIMARY KEY NOT NULL,
	"protocol_id" text NOT NULL,
	"milestone_name" text NOT NULL,
	"expected_offset_days" integer NOT NULL,
	"status" "milestone_status" DEFAULT 'pending' NOT NULL,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "treatment_protocols" (
	"id" text PRIMARY KEY NOT NULL,
	"patient_id" text NOT NULL,
	"protocol_name" text NOT NULL,
	"start_date" timestamp with time zone NOT NULL,
	"total_duration_days" integer NOT NULL,
	"is_active" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vault_records" (
	"id" text PRIMARY KEY NOT NULL,
	"patient_id" text NOT NULL,
	"encrypted_iv" text NOT NULL,
	"encrypted_ciphertext" text NOT NULL,
	"wrapped_vault_key" text NOT NULL,
	"encryption_public_key_jwk" jsonb NOT NULL,
	"signing_public_key_jwk" jsonb NOT NULL,
	"record_type" text DEFAULT 'prescription' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "continuity_risk_scores" ADD CONSTRAINT "continuity_risk_scores_protocol_id_treatment_protocols_id_fk" FOREIGN KEY ("protocol_id") REFERENCES "public"."treatment_protocols"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "protocol_milestones" ADD CONSTRAINT "protocol_milestones_protocol_id_treatment_protocols_id_fk" FOREIGN KEY ("protocol_id") REFERENCES "public"."treatment_protocols"("id") ON DELETE cascade ON UPDATE no action;