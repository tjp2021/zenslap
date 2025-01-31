-- Migration: 20250128100437_create_ai_analyses.sql
-- Description: Create AI analysis functionality with proper type safety
-- Dependencies: 
--   - auth.users (for validator_id references)
--   - public.tickets (for ticket_id foreign key)
-- Rollback: See bottom of file
-- Following migration guidelines for clean, idempotent, and properly ordered operations

BEGIN;

-- Verify dependencies
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'tickets'
    ) THEN
        RAISE EXCEPTION 'Dependency not met: public.tickets table does not exist';
    END IF;
END $$;

-- Step 1: Create types (idempotent)
DO $$ BEGIN
    CREATE TYPE public.analysis_type AS ENUM (
        'sentiment',
        'priority',
        'category',
        'response',
        'urgency'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Step 2: Create tables (idempotent)
CREATE TABLE IF NOT EXISTS public.ai_analyses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ticket_id uuid NOT NULL,
    type public.analysis_type NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    result jsonb NOT NULL,
    confidence double precision NOT NULL,
    model_info jsonb NOT NULL,
    feedback_score integer,
    feedback_notes text,
    is_validated boolean DEFAULT false,
    validated_at timestamptz,
    validated_by uuid,
    version integer DEFAULT 1 NOT NULL,
    CONSTRAINT ai_analyses_pkey PRIMARY KEY (id),
    CONSTRAINT ai_analyses_confidence_check CHECK ((confidence >= 0 AND confidence <= 1)),
    CONSTRAINT ai_analyses_feedback_score_check CHECK ((feedback_score >= -1 AND feedback_score <= 1)),
    CONSTRAINT valid_model_info CHECK (
        model_info ? 'name' AND 
        model_info ? 'version' AND 
        jsonb_typeof(model_info) = 'object'
    ),
    CONSTRAINT valid_result CHECK (jsonb_typeof(result) = 'object')
);

-- Step 3: Create indexes (idempotent)
DO $$ BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'ai_analyses' 
        AND column_name = 'ticket_id'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_ai_analyses_ticket_id ON public.ai_analyses(ticket_id);
    END IF;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'ai_analyses' 
        AND column_name = 'type'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_ai_analyses_type ON public.ai_analyses(type);
    END IF;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'ai_analyses' 
        AND column_name = 'created_at'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_ai_analyses_created_at ON public.ai_analyses(created_at);
    END IF;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'ai_analyses' 
        AND column_name = 'feedback_score'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_ai_analyses_feedback ON public.ai_analyses(feedback_score) WHERE feedback_score IS NOT NULL;
    END IF;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'ai_analyses' 
        AND column_name = 'result'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_ai_analyses_result ON public.ai_analyses USING gin(result jsonb_path_ops);
    END IF;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Step 4: Add foreign key constraints (idempotent)
DO $$ BEGIN
    ALTER TABLE public.ai_analyses
        ADD CONSTRAINT fk_ai_analyses_ticket
        FOREIGN KEY (ticket_id)
        REFERENCES public.tickets(id)
        ON DELETE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Step 5: Create functions (always replace)
CREATE OR REPLACE FUNCTION public.validate_analysis(analysis_id uuid, validator_id uuid)
RETURNS void AS $$
BEGIN
    UPDATE ai_analyses
    SET 
        is_validated = true,
        validated_at = now(),
        validated_by = validator_id
    WHERE id = analysis_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 6: Enable RLS and create policies (idempotent)
ALTER TABLE public.ai_analyses ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    CREATE POLICY "Allow insert access to service role" 
        ON public.ai_analyses 
        FOR INSERT 
        TO service_role 
        WITH CHECK (true);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE POLICY "Allow read access to authenticated users"
        ON public.ai_analyses
        FOR SELECT
        TO authenticated
        USING (
            EXISTS (
                SELECT 1 FROM public.tickets t
                WHERE t.id = ai_analyses.ticket_id
                AND (
                    t.created_by = auth.uid()
                    OR t.assignee = auth.uid()
                    OR EXISTS (
                        SELECT 1 FROM public.users_secure us
                        WHERE us.id = auth.uid()
                        AND us.role IN ('admin', 'agent')
                    )
                )
            )
        );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Step 7: Grant privileges
GRANT USAGE ON TYPE public.analysis_type TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.ai_analyses TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.validate_analysis(uuid, uuid) TO authenticated, service_role;

COMMIT;

---- Rollback SQL ----
/*
BEGIN;
    -- Drop policies
    DROP POLICY IF EXISTS "Allow read access to authenticated users" ON public.ai_analyses;
    DROP POLICY IF EXISTS "Allow insert access to service role" ON public.ai_analyses;
    
    -- Revoke privileges
    REVOKE ALL ON TABLE public.ai_analyses FROM anon, authenticated, service_role;
    REVOKE USAGE ON TYPE public.analysis_type FROM anon, authenticated, service_role;
    REVOKE EXECUTE ON FUNCTION public.validate_analysis(uuid, uuid) FROM authenticated, service_role;
    
    -- Drop function
    DROP FUNCTION IF EXISTS public.validate_analysis(uuid, uuid);
    
    -- Drop table and type
    DROP TABLE IF EXISTS public.ai_analyses;
    DROP TYPE IF EXISTS public.analysis_type;
COMMIT;
*/
