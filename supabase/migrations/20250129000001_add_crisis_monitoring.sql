-- Migration: 20250129000001_add_crisis_monitoring.sql
-- Description: Add tables and types for crisis monitoring and intervention tracking
-- Dependencies: 
--   - auth.users table
--   - public.users_secure table
--   - public.tickets table
-- Rollback: See bottom of file
-- Following migration guidelines for clean, idempotent, and properly ordered operations

-- Step 1: Verify dependencies
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'auth' AND table_name = 'users'
    ) THEN
        RAISE EXCEPTION 'Dependency not met: auth.users table does not exist';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'users_secure'
    ) THEN
        RAISE EXCEPTION 'Dependency not met: public.users_secure table does not exist';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'tickets'
    ) THEN
        RAISE EXCEPTION 'Dependency not met: public.tickets table does not exist';
    END IF;
END $$;

-- Step 2: Drop any existing types (in case of failed previous attempts)
DO $$ 
BEGIN
    DROP TYPE IF EXISTS public.contact_type CASCADE;
    DROP TYPE IF EXISTS public.event_type CASCADE;
    DROP TYPE IF EXISTS public.intervention_status CASCADE;
    DROP TYPE IF EXISTS public.intervention_type CASCADE;
    DROP TYPE IF EXISTS public.message_status CASCADE;
    DROP TYPE IF EXISTS public.metric_type CASCADE;
    DROP TYPE IF EXISTS public.audit_action_type CASCADE;
EXCEPTION
    WHEN undefined_object THEN null;
END $$;

-- Step 3: Create ENUMs (idempotent)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'contact_type') THEN
        CREATE TYPE public.contact_type AS ENUM (
            'emergency_services',
            'crisis_team',
            'mental_health',
            'support'
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'event_type') THEN
        CREATE TYPE public.event_type AS ENUM (
            'crisis_detected',
            'alert_triggered',
            'notification_sent',
            'emergency_contacted',
            'intervention_started',
            'intervention_completed'
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'intervention_status') THEN
        CREATE TYPE public.intervention_status AS ENUM (
            'active',
            'completed',
            'failed',
            'referred'
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'intervention_type') THEN
        CREATE TYPE public.intervention_type AS ENUM (
            'crisis_response',
            'emergency_services',
            'team_intervention',
            'external_referral',
            'followup'
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'message_status') THEN
        CREATE TYPE public.message_status AS ENUM (
            'pending',
            'processing',
            'completed',
            'failed'
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'metric_type') THEN
        CREATE TYPE public.metric_type AS ENUM (
            'crisis_detection_latency',
            'alert_trigger_latency',
            'notification_delivery_latency',
            'system_uptime',
            'alert_delivery_success_rate'
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'audit_action_type') THEN
        CREATE TYPE public.audit_action_type AS ENUM (
            'create',
            'update', 
            'delete',
            'acknowledge',
            'escalate',
            'validate',
            'reject',
            'assign',
            'comment',
            'status_change'
        );
    END IF;
END $$;

-- Step 4: Drop existing tables if needed (for clean recreation)
DO $$
BEGIN
    DROP TABLE IF EXISTS public.performance_metrics CASCADE;
    DROP TABLE IF EXISTS public.interventions CASCADE;
    DROP TABLE IF EXISTS public.emergency_contacts CASCADE;
    DROP TABLE IF EXISTS public.audit_log CASCADE;
EXCEPTION
    WHEN undefined_object THEN null;
END $$;

-- Step 5: Create tables with proper schema references
CREATE TABLE public.audit_log (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    event_type public.event_type NOT NULL,
    entity_type text NOT NULL,
    entity_id uuid NOT NULL,
    actor_id uuid REFERENCES auth.users(id),
    event_data jsonb NOT NULL,
    action_type public.audit_action_type,
    before_state jsonb,
    after_state jsonb,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    ip_address text,
    user_agent text,
    CONSTRAINT audit_log_pkey PRIMARY KEY (id),
    CONSTRAINT valid_metadata CHECK (jsonb_typeof(metadata) = 'object'),
    CONSTRAINT valid_before_state CHECK (jsonb_typeof(before_state) = 'object' OR before_state is null),
    CONSTRAINT valid_after_state CHECK (jsonb_typeof(after_state) = 'object' OR after_state is null)
);

CREATE TABLE public.emergency_contacts (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    service_name text NOT NULL,
    contact_type public.contact_type NOT NULL,
    priority integer NOT NULL DEFAULT 0,
    contact_details jsonb NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT emergency_contacts_pkey PRIMARY KEY (id)
);

CREATE TABLE public.interventions (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    ticket_id uuid REFERENCES public.tickets(id),
    intervention_type public.intervention_type NOT NULL,
    status public.intervention_status NOT NULL DEFAULT 'active',
    started_at timestamptz NOT NULL DEFAULT now(),
    completed_at timestamptz,
    response_time integer,
    outcome_data jsonb,
    responder_id uuid REFERENCES auth.users(id),
    CONSTRAINT interventions_pkey PRIMARY KEY (id)
);

CREATE TABLE public.performance_metrics (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    metric_type public.metric_type NOT NULL,
    value double precision NOT NULL,
    timestamp timestamptz NOT NULL DEFAULT now(),
    metadata jsonb DEFAULT '{}',
    CONSTRAINT performance_metrics_pkey PRIMARY KEY (id)
);

-- Step 6: Create indexes
DO $$ 
BEGIN
    -- Audit log indexes
    CREATE INDEX IF NOT EXISTS idx_audit_log_entity ON public.audit_log USING btree (entity_type, entity_id);
    CREATE INDEX IF NOT EXISTS idx_audit_log_event_type ON public.audit_log USING btree (event_type, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_audit_log_action ON public.audit_log USING btree (action_type, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_audit_log_actor ON public.audit_log USING btree (actor_id);
    CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON public.audit_log USING btree (created_at DESC);

    -- Interventions indexes
    CREATE INDEX IF NOT EXISTS idx_interventions_status ON public.interventions USING btree (status, started_at DESC);
    CREATE INDEX IF NOT EXISTS idx_interventions_ticket ON public.interventions USING btree (ticket_id, started_at DESC);

    -- Performance metrics index
    CREATE INDEX IF NOT EXISTS idx_performance_metrics_type ON public.performance_metrics USING btree (metric_type, timestamp DESC);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Step 7: Enable RLS
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emergency_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interventions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.performance_metrics ENABLE ROW LEVEL SECURITY;

-- Step 8: Create RLS policies (idempotent)
DO $$ 
BEGIN
    -- Audit log policies
    CREATE POLICY "Staff can view audit log"
        ON public.audit_log
        AS permissive
        FOR SELECT
        TO authenticated
        USING (
            EXISTS (
                SELECT 1
                FROM public.users_secure us
                WHERE us.id = auth.uid()
                AND us.role = ANY(ARRAY['admin', 'agent'])
            )
        );

    CREATE POLICY "System can insert audit log"
        ON public.audit_log
        AS permissive
        FOR INSERT
        TO service_role
        WITH CHECK (true);

    -- Emergency contacts policies
    CREATE POLICY "Staff can manage emergency contacts"
        ON public.emergency_contacts
        AS permissive
        FOR ALL
        TO authenticated
        USING (
            EXISTS (
                SELECT 1
                FROM public.users_secure us
                WHERE us.id = auth.uid()
                AND us.role = ANY(ARRAY['admin', 'agent'])
            )
        );

    -- Interventions policies
    CREATE POLICY "Staff can manage interventions"
        ON public.interventions
        AS permissive
        FOR ALL
        TO authenticated
        USING (
            EXISTS (
                SELECT 1
                FROM public.users_secure us
                WHERE us.id = auth.uid()
                AND us.role = ANY(ARRAY['admin', 'agent'])
            )
        );

    -- Performance metrics policies
    CREATE POLICY "Staff can view performance metrics"
        ON public.performance_metrics
        AS permissive
        FOR SELECT
        TO authenticated
        USING (
            EXISTS (
                SELECT 1
                FROM public.users_secure us
                WHERE us.id = auth.uid()
                AND us.role = ANY(ARRAY['admin', 'agent'])
            )
        );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Step 9: Create trigger functions (idempotent)
CREATE OR REPLACE FUNCTION public.update_emergency_contacts_updated_at()
    RETURNS trigger
    LANGUAGE plpgsql
    SECURITY DEFINER
AS $$
BEGIN
    new.updated_at = now();
    RETURN new;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_audit_metadata()
RETURNS trigger AS $$
BEGIN
    new.metadata = jsonb_set(
        COALESCE(new.metadata, '{}'::jsonb),
        '{request_info}',
        jsonb_build_object(
            'ip_address', current_setting('request.headers', true)::jsonb->>'x-real-ip',
            'user_agent', current_setting('request.headers', true)::jsonb->>'user-agent'
        )
    );
    RETURN new;
END;
$$ LANGUAGE plpgsql;

-- Step 10: Create triggers (idempotent)
DO $$ 
BEGIN
    DROP TRIGGER IF EXISTS update_emergency_contacts_updated_at ON public.emergency_contacts;
    CREATE TRIGGER update_emergency_contacts_updated_at
        BEFORE UPDATE ON public.emergency_contacts
        FOR EACH ROW
        EXECUTE FUNCTION public.update_emergency_contacts_updated_at();

    DROP TRIGGER IF EXISTS set_audit_metadata_trigger ON public.audit_log;
    CREATE TRIGGER set_audit_metadata_trigger
        BEFORE INSERT ON public.audit_log
        FOR EACH ROW
        EXECUTE FUNCTION public.set_audit_metadata();
END $$;

-- Step 11: Add table comments
COMMENT ON TABLE public.audit_log IS 'Audit log for tracking system events and changes';
COMMENT ON TABLE public.emergency_contacts IS 'Emergency contact information for crisis response';
COMMENT ON TABLE public.interventions IS 'Crisis intervention records and tracking';
COMMENT ON TABLE public.performance_metrics IS 'System performance and monitoring metrics';

---- Rollback SQL ----
/*
BEGIN;
    -- Drop triggers
    DROP TRIGGER IF EXISTS update_emergency_contacts_updated_at ON public.emergency_contacts;
    DROP TRIGGER IF EXISTS set_audit_metadata_trigger ON public.audit_log;
    
    -- Drop trigger functions
    DROP FUNCTION IF EXISTS public.update_emergency_contacts_updated_at();
    DROP FUNCTION IF EXISTS public.set_audit_metadata();
    
    -- Drop policies
    DROP POLICY IF EXISTS "Staff can view audit log" ON public.audit_log;
    DROP POLICY IF EXISTS "System can insert audit log" ON public.audit_log;
    DROP POLICY IF EXISTS "Staff can manage emergency contacts" ON public.emergency_contacts;
    DROP POLICY IF EXISTS "Staff can manage interventions" ON public.interventions;
    DROP POLICY IF EXISTS "Staff can view performance metrics" ON public.performance_metrics;
    
    -- Drop tables
    DROP TABLE IF EXISTS public.performance_metrics CASCADE;
    DROP TABLE IF EXISTS public.interventions CASCADE;
    DROP TABLE IF EXISTS public.emergency_contacts CASCADE;
    DROP TABLE IF EXISTS public.audit_log CASCADE;
    
    -- Drop types
    DROP TYPE IF EXISTS public.audit_action_type CASCADE;
    DROP TYPE IF EXISTS public.metric_type CASCADE;
    DROP TYPE IF EXISTS public.message_status CASCADE;
    DROP TYPE IF EXISTS public.intervention_type CASCADE;
    DROP TYPE IF EXISTS public.intervention_status CASCADE;
    DROP TYPE IF EXISTS public.event_type CASCADE;
    DROP TYPE IF EXISTS public.contact_type CASCADE;
COMMIT;
*/ 