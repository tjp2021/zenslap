-- Migration: 20250128102000_force_ai_analyses.sql
-- Description: Force recreation of AI analyses table with proper constraints
-- Dependencies: 
--   - public.analysis_type enum
--   - public.tickets table
-- Rollback: See bottom of file
-- Following migration guidelines for clean, idempotent, and properly ordered operations

-- Step 1: Verify dependencies
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_type 
        WHERE typname = 'analysis_type' 
        AND typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
    ) THEN
        RAISE EXCEPTION 'Dependency not met: public.analysis_type enum does not exist';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'tickets'
    ) THEN
        RAISE EXCEPTION 'Dependency not met: public.tickets table does not exist';
    END IF;
END $$;

-- Step 2: Drop existing constraints if they exist
DO $$ 
BEGIN
    EXECUTE 'ALTER TABLE IF EXISTS public.ai_analyses DROP CONSTRAINT IF EXISTS fk_ai_analyses_ticket CASCADE';
EXCEPTION
    WHEN undefined_table THEN null;
END $$;

-- Step 3: Create or update table
DO $$ 
DECLARE
    table_exists boolean;
BEGIN
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'ai_analyses'
    ) INTO table_exists;

    IF NOT table_exists THEN
        -- Create table if it doesn't exist
        CREATE TABLE public.ai_analyses (
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
    ELSE
        -- Add missing columns if they don't exist
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'ai_analyses' 
            AND column_name = 'type'
        ) THEN
            ALTER TABLE public.ai_analyses ADD COLUMN type public.analysis_type;
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'ai_analyses' 
            AND column_name = 'confidence'
        ) THEN
            ALTER TABLE public.ai_analyses ADD COLUMN confidence double precision;
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'ai_analyses' 
            AND column_name = 'model_info'
        ) THEN
            ALTER TABLE public.ai_analyses ADD COLUMN model_info jsonb;
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'ai_analyses' 
            AND column_name = 'result'
        ) THEN
            ALTER TABLE public.ai_analyses ADD COLUMN result jsonb;
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'ai_analyses' 
            AND column_name = 'version'
        ) THEN
            ALTER TABLE public.ai_analyses ADD COLUMN version integer DEFAULT 1;
        END IF;

        -- Update column constraints
        ALTER TABLE public.ai_analyses 
            ALTER COLUMN confidence SET NOT NULL,
            ALTER COLUMN model_info SET NOT NULL,
            ALTER COLUMN result SET NOT NULL,
            ALTER COLUMN version SET NOT NULL;

        -- Add check constraints if they don't exist
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.check_constraints 
            WHERE constraint_schema = 'public' 
            AND constraint_name = 'ai_analyses_confidence_check'
        ) THEN
            ALTER TABLE public.ai_analyses 
                ADD CONSTRAINT ai_analyses_confidence_check 
                CHECK (confidence >= 0 AND confidence <= 1);
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM information_schema.check_constraints 
            WHERE constraint_schema = 'public' 
            AND constraint_name = 'ai_analyses_feedback_score_check'
        ) THEN
            ALTER TABLE public.ai_analyses 
                ADD CONSTRAINT ai_analyses_feedback_score_check 
                CHECK (feedback_score >= -1 AND feedback_score <= 1);
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM information_schema.check_constraints 
            WHERE constraint_schema = 'public' 
            AND constraint_name = 'valid_model_info'
        ) THEN
            ALTER TABLE public.ai_analyses 
                ADD CONSTRAINT valid_model_info 
                CHECK (
                    model_info ? 'name' AND 
                    model_info ? 'version' AND 
                    jsonb_typeof(model_info) = 'object'
                );
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM information_schema.check_constraints 
            WHERE constraint_schema = 'public' 
            AND constraint_name = 'valid_result'
        ) THEN
            ALTER TABLE public.ai_analyses 
                ADD CONSTRAINT valid_result 
                CHECK (jsonb_typeof(result) = 'object');
        END IF;
    END IF;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Step 4: Recreate foreign key constraint
DO $$ 
BEGIN
    ALTER TABLE public.ai_analyses
        ADD CONSTRAINT fk_ai_analyses_ticket
        FOREIGN KEY (ticket_id)
        REFERENCES public.tickets(id)
        ON DELETE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Step 5: Recreate indexes
DO $$ 
BEGIN
    -- Check and create ticket_id index
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'ai_analyses' 
        AND column_name = 'ticket_id'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_ai_analyses_ticket_id ON public.ai_analyses(ticket_id);
    END IF;

    -- Check and create type index
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'ai_analyses' 
        AND column_name = 'type'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_ai_analyses_type ON public.ai_analyses(type);
    END IF;

    -- Check and create created_at index
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'ai_analyses' 
        AND column_name = 'created_at'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_ai_analyses_created_at ON public.ai_analyses(created_at);
    END IF;

    -- Check and create feedback_score index
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'ai_analyses' 
        AND column_name = 'feedback_score'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_ai_analyses_feedback ON public.ai_analyses(feedback_score) WHERE feedback_score IS NOT NULL;
    END IF;

    -- Check and create result index
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

-- Step 6: Enable RLS and recreate policies
ALTER TABLE public.ai_analyses ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    CREATE POLICY "Allow insert access to service role" 
        ON public.ai_analyses 
        FOR INSERT 
        TO service_role 
        WITH CHECK (true);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ 
BEGIN
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
GRANT ALL ON TABLE public.ai_analyses TO anon, authenticated, service_role;

---- Rollback SQL ----
/*
BEGIN;
    -- Drop policies
    DROP POLICY IF EXISTS "Allow read access to authenticated users" ON public.ai_analyses;
    DROP POLICY IF EXISTS "Allow insert access to service role" ON public.ai_analyses;
    
    -- Revoke privileges
    REVOKE ALL ON TABLE public.ai_analyses FROM anon, authenticated, service_role;
    
    -- Drop table
    DROP TABLE IF EXISTS public.ai_analyses CASCADE;
COMMIT;
*/ 