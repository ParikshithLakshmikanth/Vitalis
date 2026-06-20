import postgres from 'postgres';

async function pushSchema() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('❌ DATABASE_URL is not set in .env');
    process.exit(1);
  }

  console.log('🔄 Pushing schema to database...');
  const sql = postgres(connectionString, { max: 1 });

  try {
    // 1. Safely create enum
    await sql`
      DO $$ BEGIN
        CREATE TYPE "public"."milestone_status" AS ENUM('pending', 'completed', 'missed');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `;

    // 2. Create tables safely
    await sql`
      CREATE TABLE IF NOT EXISTS "treatment_protocols" (
        "id" text PRIMARY KEY NOT NULL,
        "patient_id" text NOT NULL,
        "protocol_name" text NOT NULL,
        "start_date" timestamp with time zone NOT NULL,
        "total_duration_days" integer NOT NULL,
        "is_active" integer DEFAULT 1 NOT NULL,
        "created_at" timestamp with time zone DEFAULT now() NOT NULL
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS "continuity_risk_scores" (
        "id" text PRIMARY KEY NOT NULL,
        "patient_id" text NOT NULL,
        "protocol_id" text NOT NULL,
        "risk_percentage" real NOT NULL,
        "risk_factors_json" jsonb NOT NULL,
        "suggested_intervention" text,
        "latency_days" integer,
        "updated_at" timestamp with time zone DEFAULT now() NOT NULL
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS "protocol_milestones" (
        "id" text PRIMARY KEY NOT NULL,
        "protocol_id" text NOT NULL,
        "milestone_name" text NOT NULL,
        "expected_offset_days" integer NOT NULL,
        "status" "milestone_status" DEFAULT 'pending' NOT NULL,
        "completed_at" timestamp with time zone,
        "created_at" timestamp with time zone DEFAULT now() NOT NULL
      );
    `;

    // 3. Create constraints safely
    await sql`
      DO $$ BEGIN
        ALTER TABLE "continuity_risk_scores" 
        ADD CONSTRAINT "continuity_risk_scores_protocol_id_treatment_protocols_id_fk" 
        FOREIGN KEY ("protocol_id") REFERENCES "public"."treatment_protocols"("id") ON DELETE cascade ON UPDATE no action;
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `;

    await sql`
      DO $$ BEGIN
        ALTER TABLE "protocol_milestones" 
        ADD CONSTRAINT "protocol_milestones_protocol_id_treatment_protocols_id_fk" 
        FOREIGN KEY ("protocol_id") REFERENCES "public"."treatment_protocols"("id") ON DELETE cascade ON UPDATE no action;
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `;

    console.log('✅ Schema pushed successfully! All tables exist.');
  } catch (error) {
    console.error('❌ Schema push failed:', error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

pushSchema();
