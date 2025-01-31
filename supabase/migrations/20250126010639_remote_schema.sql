-- Migration: 20250126010639_remote_schema.sql
-- Description: Initial schema setup with proper ordering and idempotent operations
-- Following migration guidelines for clean, idempotent, and properly ordered operations

-- Step 1: Extensions (only if not exists)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";

-- Step 2: Drop everything in reverse dependency order
DO $$ 
DECLARE
    r record;
BEGIN
    -- First disable RLS
    FOR r IN (SELECT schemaname, tablename FROM pg_tables WHERE schemaname = 'public')
    LOOP
        EXECUTE format('ALTER TABLE IF EXISTS %I.%I DISABLE ROW LEVEL SECURITY', r.schemaname, r.tablename);
    END LOOP;

    -- Drop all policies
    FOR r IN (SELECT schemaname, tablename, policyname FROM pg_policies WHERE schemaname = 'public')
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
    END LOOP;

    -- Drop all foreign key constraints
    FOR r IN (
        SELECT tc.table_schema, tc.constraint_name, tc.table_name
        FROM information_schema.table_constraints tc
        WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public'
    )
    LOOP
        EXECUTE format('ALTER TABLE IF EXISTS %I.%I DROP CONSTRAINT IF EXISTS %I CASCADE', 
            r.table_schema, r.table_name, r.constraint_name);
    END LOOP;

    -- Drop all triggers
    FOR r IN (
        SELECT tgname, relname 
        FROM pg_trigger 
        JOIN pg_class ON pg_trigger.tgrelid = pg_class.oid 
        JOIN pg_namespace ON pg_class.relnamespace = pg_namespace.oid 
        WHERE nspname = 'public'
    )
    LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.%I CASCADE', r.tgname, r.relname);
    END LOOP;
END $$;

-- Step 3: Drop tables in reverse dependency order
DROP TABLE IF EXISTS "public"."notifications" CASCADE;
DROP TABLE IF EXISTS "public"."ticket_activities" CASCADE;
DROP TABLE IF EXISTS "public"."internal_notes" CASCADE;
DROP TABLE IF EXISTS "public"."ticket_messages" CASCADE;
DROP TABLE IF EXISTS "public"."ticket_tags" CASCADE;
DROP TABLE IF EXISTS "public"."ticket_history" CASCADE;
DROP TABLE IF EXISTS "public"."tickets" CASCADE;
DROP TABLE IF EXISTS "public"."users_secure" CASCADE;
DROP TABLE IF EXISTS "public"."profiles" CASCADE;
DROP TABLE IF EXISTS "public"."tags" CASCADE;
DROP TABLE IF EXISTS "public"."quick_responses" CASCADE;
DROP TABLE IF EXISTS "public"."response_categories" CASCADE;
DROP TABLE IF EXISTS "public"."audit_log" CASCADE;
DROP TABLE IF EXISTS "public"."debug_log" CASCADE;
DROP TABLE IF EXISTS "public"."schema_info" CASCADE;

-- Step 4: Drop types
DROP TYPE IF EXISTS "public"."analysis_type" CASCADE;
DROP TYPE IF EXISTS "public"."contact_type" CASCADE;
DROP TYPE IF EXISTS "public"."event_type" CASCADE;
DROP TYPE IF EXISTS "public"."feedback_rating" CASCADE;
DROP TYPE IF EXISTS "public"."intervention_status" CASCADE;
DROP TYPE IF EXISTS "public"."intervention_type" CASCADE;
DROP TYPE IF EXISTS "public"."message_status" CASCADE;
DROP TYPE IF EXISTS "public"."metric_type" CASCADE;
DROP TYPE IF EXISTS "public"."sla_status" CASCADE;

-- Step 5: Create types
DO $$ BEGIN
    CREATE TYPE "public"."analysis_type" AS ENUM (
        'sentiment',
        'priority',
        'category',
        'response',
        'urgency'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "public"."contact_type" AS ENUM (
        'emergency_services',
        'crisis_team',
        'mental_health',
        'support'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "public"."event_type" AS ENUM (
        'crisis_detected',
        'alert_triggered',
        'notification_sent',
        'emergency_contacted',
        'intervention_started',
        'intervention_completed'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "public"."feedback_rating" AS ENUM (
        'high',
        'medium',
        'low',
        'neutral'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "public"."intervention_status" AS ENUM (
        'active',
        'completed',
        'failed',
        'referred'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "public"."intervention_type" AS ENUM (
        'crisis_response',
        'emergency_services',
        'team_intervention',
        'external_referral',
        'followup'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "public"."message_status" AS ENUM (
        'pending',
        'processing',
        'completed',
        'failed'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "public"."metric_type" AS ENUM (
        'crisis_detection_latency',
        'alert_trigger_latency',
        'notification_delivery_latency',
        'system_uptime',
        'alert_delivery_success_rate'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "public"."sla_status" AS ENUM (
        'pending',
        'breached',
        'met'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Step 6: Create tables in dependency order
CREATE TABLE IF NOT EXISTS "public"."users_secure" (
    "id" uuid NOT NULL,
    "email" text NOT NULL,
    "role" text,
    "created_at" timestamptz NOT NULL DEFAULT now(),
    "updated_at" timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT "users_secure_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" uuid NOT NULL,
    "email" text,
    "role" text,
    CONSTRAINT "profiles_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "public"."tickets" (
    "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
    "title" text NOT NULL,
    "description" text NOT NULL,
    "status" text NOT NULL DEFAULT 'open',
    "priority" text DEFAULT 'medium',
    "metadata" jsonb NOT NULL DEFAULT '{}',
    "created_by" uuid NOT NULL,
    "assignee" uuid,
    "created_at" timestamptz NOT NULL DEFAULT now(),
    "updated_at" timestamptz NOT NULL DEFAULT now(),
    "sla_response_deadline" timestamptz,
    "sla_resolution_deadline" timestamptz,
    "first_response_at" timestamptz,
    "resolution_at" timestamptz,
    "sla_response_status" public.sla_status DEFAULT 'pending',
    "sla_resolution_status" public.sla_status DEFAULT 'pending',
    CONSTRAINT "tickets_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "tickets_status_check" CHECK (status IN ('open', 'in_progress', 'resolved', 'closed'))
);

CREATE TABLE IF NOT EXISTS "public"."ticket_activities" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "ticket_id" uuid NOT NULL,
    "actor_id" uuid NOT NULL,
    "activity_type" text NOT NULL,
    "content" jsonb NOT NULL,
    "mentioned_user_ids" uuid[] DEFAULT ARRAY[]::uuid[],
    "created_at" timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT "ticket_activities_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "public"."notifications" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "user_id" uuid NOT NULL,
    "activity_id" uuid NOT NULL,
    "read" boolean NOT NULL DEFAULT false,
    "created_at" timestamptz NOT NULL DEFAULT now(),
    "updated_at" timestamptz NOT NULL DEFAULT now(),
    "ai_analysis_id" uuid,
    "priority" text,
    "confidence" double precision,
    "ai_metadata" jsonb DEFAULT '{}'::jsonb,
    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "public"."internal_notes" (
    "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
    "ticket_id" uuid NOT NULL,
    "content" text NOT NULL,
    "created_by" uuid NOT NULL,
    "created_at" timestamptz NOT NULL DEFAULT now(),
    "updated_at" timestamptz NOT NULL DEFAULT now(),
    "mentions" text[],
    CONSTRAINT "internal_notes_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "public"."tags" (
    "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
    "name" text NOT NULL,
    "color" text,
    "created_at" timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT "tags_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "tags_name_key" UNIQUE ("name")
);

CREATE TABLE IF NOT EXISTS "public"."ticket_tags" (
    "ticket_id" uuid NOT NULL,
    "tag_id" uuid NOT NULL,
    "created_at" timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT "ticket_tags_pkey" PRIMARY KEY ("ticket_id", "tag_id")
);

-- Step 7: Create indexes
CREATE INDEX IF NOT EXISTS "idx_tickets_created_by" ON "public"."tickets" ("created_by");
CREATE INDEX IF NOT EXISTS "idx_tickets_assignee" ON "public"."tickets" ("assignee");
CREATE INDEX IF NOT EXISTS "idx_tickets_status" ON "public"."tickets" ("status");
CREATE INDEX IF NOT EXISTS "idx_tickets_priority" ON "public"."tickets" ("priority");

CREATE INDEX IF NOT EXISTS "idx_ticket_activities_ticket_id" ON "public"."ticket_activities" ("ticket_id");
CREATE INDEX IF NOT EXISTS "idx_notifications_user_id" ON "public"."notifications" ("user_id");

-- Step 8: Add foreign key constraints
ALTER TABLE "public"."profiles" 
    ADD CONSTRAINT "profiles_id_fkey" 
    FOREIGN KEY ("id") REFERENCES "auth"."users"("id") 
    ON DELETE CASCADE;

ALTER TABLE "public"."tickets" 
    ADD CONSTRAINT "tickets_created_by_fkey" 
    FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");

ALTER TABLE "public"."tickets" 
    ADD CONSTRAINT "tickets_assignee_fkey" 
    FOREIGN KEY ("assignee") REFERENCES "auth"."users"("id");

ALTER TABLE "public"."ticket_activities" 
    ADD CONSTRAINT "ta_ticket_id_fkey" 
    FOREIGN KEY ("ticket_id") REFERENCES "public"."tickets"("id") 
    ON DELETE CASCADE;

ALTER TABLE "public"."ticket_activities" 
    ADD CONSTRAINT "ta_actor_id_fkey" 
    FOREIGN KEY ("actor_id") REFERENCES "public"."users_secure"("id") 
    ON DELETE CASCADE;

ALTER TABLE "public"."notifications" 
    ADD CONSTRAINT "notifications_user_id_fkey" 
    FOREIGN KEY ("user_id") REFERENCES "public"."users_secure"("id") 
    ON DELETE CASCADE;

ALTER TABLE "public"."notifications" 
    ADD CONSTRAINT "notifications_activity_id_fkey" 
    FOREIGN KEY ("activity_id") REFERENCES "public"."ticket_activities"("id") 
    ON DELETE CASCADE;

ALTER TABLE "public"."internal_notes" 
    ADD CONSTRAINT "internal_notes_ticket_id_fkey" 
    FOREIGN KEY ("ticket_id") REFERENCES "public"."tickets"("id") 
    ON DELETE CASCADE;

ALTER TABLE "public"."ticket_tags" 
    ADD CONSTRAINT "ticket_tags_ticket_id_fkey" 
    FOREIGN KEY ("ticket_id") REFERENCES "public"."tickets"("id") 
    ON DELETE CASCADE;

ALTER TABLE "public"."ticket_tags" 
    ADD CONSTRAINT "ticket_tags_tag_id_fkey" 
    FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") 
    ON DELETE CASCADE;

-- Step 9: Create functions
CREATE OR REPLACE FUNCTION "public"."calculate_sla_deadlines"()
RETURNS TRIGGER AS $$
DECLARE
    policy_record RECORD;
BEGIN
    -- Get the active SLA policy for the ticket's priority
    SELECT * INTO policy_record
    FROM public.sla_policies
    WHERE priority = NEW.priority AND is_active = true;

    IF FOUND THEN
        -- Calculate response deadline
        NEW.sla_response_deadline := NEW.created_at + (policy_record.response_time_hours || ' hours')::interval;
        -- Calculate resolution deadline
        NEW.sla_resolution_deadline := NEW.created_at + (policy_record.resolution_time_hours || ' hours')::interval;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION "public"."create_mention_notifications"()
RETURNS TRIGGER AS $$
BEGIN
    -- If there are mentioned users, create notifications for staff members
    IF NEW.mentioned_user_ids IS NOT NULL THEN
        INSERT INTO notifications (user_id, activity_id)
        SELECT us.id, NEW.id
        FROM unnest(NEW.mentioned_user_ids) AS mentioned_id
        JOIN users_secure us ON us.id = mentioned_id
        WHERE us.role IN ('ADMIN', 'AGENT');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION "public"."update_updated_at"()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 10: Create triggers
DO $$ BEGIN
    CREATE TRIGGER "set_ticket_sla_deadlines"
        BEFORE INSERT ON "public"."tickets"
        FOR EACH ROW
        EXECUTE FUNCTION "public"."calculate_sla_deadlines"();
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TRIGGER "on_mention"
        AFTER INSERT OR UPDATE OF mentioned_user_ids ON "public"."ticket_activities"
        FOR EACH ROW
        WHEN (NEW.activity_type = 'comment')
        EXECUTE FUNCTION "public"."create_mention_notifications"();
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TRIGGER "set_updated_at"
        BEFORE UPDATE ON "public"."notifications"
        FOR EACH ROW
        EXECUTE FUNCTION "public"."update_updated_at"();
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Step 11: Enable RLS and create policies
ALTER TABLE "public"."tickets" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."ticket_activities" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."internal_notes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."tags" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."ticket_tags" ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    CREATE POLICY "tickets_select_policy" ON "public"."tickets"
        FOR SELECT USING (
            auth.uid() = created_by OR 
            EXISTS (
                SELECT 1 FROM public.users_secure 
                WHERE id = auth.uid() 
                AND role IN ('admin', 'agent')
            )
        );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE POLICY "tickets_insert_policy" ON "public"."tickets"
        FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE POLICY "tickets_update_policy" ON "public"."tickets"
        FOR UPDATE USING (
            EXISTS (
                SELECT 1 FROM public.users_secure 
                WHERE id = auth.uid() 
                AND role IN ('admin', 'agent')
            )
        );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE POLICY "notifications_select_policy" ON "public"."notifications"
        FOR SELECT USING (user_id = auth.uid());
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE POLICY "notifications_update_policy" ON "public"."notifications"
        FOR UPDATE USING (user_id = auth.uid())
        WITH CHECK (user_id = auth.uid());
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;


