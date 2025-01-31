-- Migration: 20250128103001_update_insight_feedback_types.sql
-- Description: Add feedback rating type and update insight_feedback table
-- Dependencies: 
--   - public.insight_feedback table
-- Rollback: See bottom of file
-- Following migration guidelines for clean, idempotent, and properly ordered operations

-- Step 1: Create the new enum type (idempotent)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_type 
        WHERE typname = 'feedback_rating' 
        AND typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
    ) THEN
        CREATE TYPE public.feedback_rating AS ENUM ('high', 'medium', 'low', 'neutral');
    END IF;
END $$;

-- Step 2: Add new columns to insight_feedback (idempotent)
DO $$ 
BEGIN
    -- Add rating column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'insight_feedback' 
        AND column_name = 'rating'
    ) THEN
        ALTER TABLE public.insight_feedback 
        ADD COLUMN rating public.feedback_rating;
    END IF;

    -- Add category column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'insight_feedback' 
        AND column_name = 'category'
    ) THEN
        ALTER TABLE public.insight_feedback 
        ADD COLUMN category text;
    END IF;
EXCEPTION
    WHEN undefined_table THEN
        RAISE EXCEPTION 'Table insight_feedback does not exist';
END $$;

-- Step 3: Create indexes for new columns (idempotent)
DO $$ 
BEGIN
    -- Create rating index if column exists
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'insight_feedback' 
        AND column_name = 'rating'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_insight_feedback_rating 
        ON public.insight_feedback(rating);
    END IF;

    -- Create category index if column exists
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'insight_feedback' 
        AND column_name = 'category'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_insight_feedback_category 
        ON public.insight_feedback(category);
    END IF;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

---- Rollback SQL ----
/*
BEGIN;
    -- Drop indexes
    DROP INDEX IF EXISTS public.idx_insight_feedback_rating;
    DROP INDEX IF EXISTS public.idx_insight_feedback_category;
    
    -- Drop columns
    ALTER TABLE public.insight_feedback 
    DROP COLUMN IF EXISTS rating,
    DROP COLUMN IF EXISTS category;
    
    -- Drop type
    DROP TYPE IF EXISTS public.feedback_rating;
COMMIT;
*/ 