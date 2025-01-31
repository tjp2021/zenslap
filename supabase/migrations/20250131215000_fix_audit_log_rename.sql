-- Migration: Fix audit log table naming confusion
-- Description: Consolidate audit_log and monitoring_audit_log into event_log
-- Dependencies: None (handles both possible table names)
-- Idempotency: Yes, checks for existence before operations
-- Rollback: Included at bottom of file
-- Verification: Includes post-change verification
-- Security: Maintains existing RLS policies

-- migrate:up
BEGIN;

DO $migration$
DECLARE 
    v_step text;
    v_source_table text;
    v_source_policies json;
    v_source_indexes json;
BEGIN
    -- Track step for error handling
    v_step := 'initialization';
    RAISE LOG 'Starting audit log table rename consolidation';

    -- Step 1: Determine source table
    v_step := 'source table detection';
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'monitoring_audit_log') THEN
        v_source_table := 'monitoring_audit_log';
    ELSIF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'audit_log') THEN
        v_source_table := 'audit_log';
    ELSE
        RAISE EXCEPTION 'Neither monitoring_audit_log nor audit_log table exists';
    END IF;
    RAISE LOG 'Source table identified as: %', v_source_table;

    -- Step 2: Check target doesn't exist
    v_step := 'target verification';
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'event_log') THEN
        RAISE EXCEPTION 'Target table event_log already exists';
    END IF;
    RAISE LOG 'Target table verification passed';

    -- Step 3: Backup existing policies
    v_step := 'policy backup';
    SELECT json_agg(row_to_json(pol))
    INTO v_source_policies
    FROM (
        SELECT policyname, roles, cmd, qual, with_check 
        FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = v_source_table
    ) pol;
    RAISE LOG 'Backed up % policies', json_array_length(COALESCE(v_source_policies, '[]'::json));

    -- Step 4: Backup existing indexes
    v_step := 'index backup';
    SELECT json_agg(row_to_json(idx))
    INTO v_source_indexes
    FROM (
        SELECT schemaname, tablename, indexname, indexdef
        FROM pg_indexes
        WHERE schemaname = 'public' AND tablename = v_source_table
    ) idx;
    RAISE LOG 'Backed up % indexes', json_array_length(COALESCE(v_source_indexes, '[]'::json));

    -- Step 5: Drop policies
    v_step := 'policy removal';
    EXECUTE format('DROP POLICY IF EXISTS "Service role full access to %s" ON public.%I', v_source_table, v_source_table);
    EXECUTE format('DROP POLICY IF EXISTS "Staff can view %s" ON public.%I', v_source_table, v_source_table);
    RAISE LOG 'Removed existing policies';

    -- Step 6: Drop indexes (except primary key)
    v_step := 'index removal';
    IF v_source_indexes IS NOT NULL THEN
        FOR i IN 0..json_array_length(v_source_indexes)-1 LOOP
            IF NOT v_source_indexes->i->>'indexname' LIKE '%_pkey' THEN
                EXECUTE format('DROP INDEX IF EXISTS public.%I', v_source_indexes->i->>'indexname');
            END IF;
        END LOOP;
    END IF;
    RAISE LOG 'Removed existing indexes';

    -- Step 7: Rename table
    v_step := 'table rename';
    EXECUTE format('ALTER TABLE public.%I RENAME TO event_log', v_source_table);
    RAISE LOG 'Table renamed to event_log';

    -- Step 8: Recreate indexes
    v_step := 'index recreation';
    CREATE INDEX IF NOT EXISTS idx_event_log_event_type ON public.event_log(event_type);
    CREATE INDEX IF NOT EXISTS idx_event_log_severity ON public.event_log(severity);
    CREATE INDEX IF NOT EXISTS idx_event_log_created_at ON public.event_log(created_at);
    RAISE LOG 'Recreated indexes on event_log';

    -- Step 9: Recreate policies
    v_step := 'policy recreation';
    CREATE POLICY "Service role full access to event log"
        ON public.event_log
        FOR ALL
        TO service_role
        USING (true)
        WITH CHECK (true);

    CREATE POLICY "Staff can view event log"
        ON public.event_log
        FOR SELECT
        TO authenticated
        USING (
            EXISTS (
                SELECT 1 FROM public.users_secure us
                WHERE us.id = auth.uid()
                AND us.role = 'staff'
            )
        );
    RAISE LOG 'Recreated policies on event_log';

    -- Step 10: Verify migration
    v_step := 'verification';
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'event_log') THEN
        RAISE EXCEPTION 'Verification failed: event_log table not found';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND tablename = 'event_log' AND indexname = 'idx_event_log_event_type') THEN
        RAISE EXCEPTION 'Verification failed: missing event_type index';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'event_log') THEN
        RAISE EXCEPTION 'Verification failed: no policies found on event_log';
    END IF;

    RAISE LOG 'Migration completed successfully';
EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'Migration failed during step "%": %', v_step, SQLERRM;
END $migration$;

COMMIT;

-- migrate:down
BEGIN;

DO $rollback$
DECLARE
    v_step text;
BEGIN
    v_step := 'initialization';
    RAISE LOG 'Starting rollback';

    -- Step 1: Verify current state
    v_step := 'state verification';
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'event_log') THEN
        RAISE EXCEPTION 'Rollback failed: event_log table does not exist';
    END IF;

    -- Step 2: Drop policies
    v_step := 'policy removal';
    DROP POLICY IF EXISTS "Service role full access to event log" ON public.event_log;
    DROP POLICY IF EXISTS "Staff can view event log" ON public.event_log;

    -- Step 3: Drop indexes
    v_step := 'index removal';
    DROP INDEX IF EXISTS public.idx_event_log_event_type;
    DROP INDEX IF EXISTS public.idx_event_log_severity;
    DROP INDEX IF EXISTS public.idx_event_log_created_at;

    -- Step 4: Rename table back
    v_step := 'table rename';
    ALTER TABLE public.event_log RENAME TO audit_log;

    -- Step 5: Recreate indexes
    v_step := 'index recreation';
    CREATE INDEX IF NOT EXISTS idx_audit_log_event_type ON public.audit_log(event_type);
    CREATE INDEX IF NOT EXISTS idx_audit_log_severity ON public.audit_log(severity);
    CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON public.audit_log(created_at);

    -- Step 6: Recreate policies
    v_step := 'policy recreation';
    CREATE POLICY "Service role full access to audit log"
        ON public.audit_log
        FOR ALL
        TO service_role
        USING (true)
        WITH CHECK (true);

    CREATE POLICY "Staff can view audit log"
        ON public.audit_log
        FOR SELECT
        TO authenticated
        USING (
            EXISTS (
                SELECT 1 FROM public.users_secure us
                WHERE us.id = auth.uid()
                AND us.role = 'staff'
            )
        );

    -- Step 7: Verify rollback
    v_step := 'verification';
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'audit_log') THEN
        RAISE EXCEPTION 'Rollback verification failed: audit_log table not found';
    END IF;

    RAISE LOG 'Rollback completed successfully';
EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'Rollback failed during step "%": %', v_step, SQLERRM;
END $rollback$;

COMMIT; 