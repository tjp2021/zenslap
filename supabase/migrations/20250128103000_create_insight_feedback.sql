-- Migration: 20250128103000_create_insight_feedback.sql
-- Description: Create table for tracking user feedback on AI insights
-- Dependencies: 
--   - auth.users (for user_id references)
--   - public.ai_analyses (for analysis_id references)
-- Rollback: See bottom of file
-- Following migration guidelines for clean, idempotent, and properly ordered operations

-- Step 1: Create table (idempotent)
CREATE TABLE IF NOT EXISTS public.insight_feedback (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    analysis_id uuid NOT NULL,
    user_id uuid NOT NULL,
    feedback_type text NOT NULL,
    feedback_text text,
    created_at timestamptz DEFAULT now() NOT NULL,
    CONSTRAINT insight_feedback_pkey PRIMARY KEY (id),
    CONSTRAINT fk_insight_feedback_analysis 
        FOREIGN KEY (analysis_id) 
        REFERENCES public.ai_analyses(id) 
        ON DELETE CASCADE,
    CONSTRAINT fk_insight_feedback_user 
        FOREIGN KEY (user_id) 
        REFERENCES auth.users(id) 
        ON DELETE CASCADE
);

-- Step 2: Create indexes (idempotent)
DO $$ 
BEGIN
    -- Check and create analysis_id index
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'insight_feedback' 
        AND column_name = 'analysis_id'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_insight_feedback_analysis 
        ON public.insight_feedback(analysis_id);
    END IF;

    -- Check and create user_id index
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'insight_feedback' 
        AND column_name = 'user_id'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_insight_feedback_user 
        ON public.insight_feedback(user_id);
    END IF;

    -- Check and create feedback_type index
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'insight_feedback' 
        AND column_name = 'feedback_type'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_insight_feedback_type 
        ON public.insight_feedback(feedback_type);
    END IF;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Step 3: Enable RLS and create policies (idempotent)
ALTER TABLE public.insight_feedback ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to insert feedback
DO $$ 
BEGIN
    CREATE POLICY "Users can insert their own feedback"
        ON public.insight_feedback
        FOR INSERT
        TO authenticated
        WITH CHECK ((auth.uid())::uuid = user_id::uuid);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Allow users to read their own feedback and admins/agents to read all
DO $$ 
BEGIN
    CREATE POLICY "Users can read own feedback, admins/agents can read all"
        ON public.insight_feedback
        FOR SELECT
        TO authenticated
        USING (
            user_id::uuid = (auth.uid())::uuid
            OR EXISTS (
                SELECT 1 FROM public.users_secure us
                WHERE us.id = (auth.uid())::uuid
                AND us.role IN ('admin', 'agent')
            )
        );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Step 4: Grant privileges
GRANT ALL ON TABLE public.insight_feedback TO authenticated;
GRANT ALL ON TABLE public.insight_feedback TO service_role;

---- Rollback SQL ----
/*
BEGIN;
    -- Drop policies
    DROP POLICY IF EXISTS "Users can insert their own feedback" ON public.insight_feedback;
    DROP POLICY IF EXISTS "Users can read own feedback, admins/agents can read all" ON public.insight_feedback;
    
    -- Revoke privileges
    REVOKE ALL ON TABLE public.insight_feedback FROM authenticated;
    REVOKE ALL ON TABLE public.insight_feedback FROM service_role;
    
    -- Drop table
    DROP TABLE IF EXISTS public.insight_feedback CASCADE;
COMMIT;
*/ 