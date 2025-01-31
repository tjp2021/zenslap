-- Migration: 20250128214633_add_monitoring_tables.sql
-- Description: Create tables for monitoring events and audit logging
-- Dependencies: 
--   - auth.users table
--   - public.users_secure table
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
END $$;

-- Step 2: Drop dependencies (ALWAYS use CASCADE)
DROP TABLE IF EXISTS message_queue CASCADE;
DROP TABLE IF EXISTS monitoring_audit_log CASCADE;

-- Step 3: Create base tables
CREATE TABLE IF NOT EXISTS message_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type TEXT NOT NULL,
    initial_severity TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    data JSONB NOT NULL,
    source TEXT NOT NULL,
    context JSONB,
    user_id UUID REFERENCES auth.users(id),
    session_id TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    processed_at TIMESTAMPTZ,
    processing_metadata JSONB,
    error TEXT,
    retry_count INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS monitoring_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type TEXT NOT NULL,
    severity TEXT NOT NULL,
    event_data JSONB NOT NULL,
    analysis_data JSONB,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Step 4: Add constraints and foreign keys
DO $$ 
BEGIN
    ALTER TABLE message_queue
        ADD CONSTRAINT valid_status 
        CHECK (status IN ('pending', 'processing', 'processed', 'error'));
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Step 5: Create indexes (idempotent)
DO $$ 
BEGIN
    -- Message queue indexes
    CREATE INDEX IF NOT EXISTS idx_message_queue_status 
        ON message_queue(status) 
        WHERE status = 'pending';
    
    CREATE INDEX IF NOT EXISTS idx_message_queue_created_at 
        ON message_queue(created_at);
    
    CREATE INDEX IF NOT EXISTS idx_message_queue_user_id 
        ON message_queue(user_id);
    
    -- Monitoring audit log indexes
    CREATE INDEX IF NOT EXISTS idx_monitoring_audit_event_type 
        ON monitoring_audit_log(event_type);
    
    CREATE INDEX IF NOT EXISTS idx_monitoring_audit_severity 
        ON monitoring_audit_log(severity);
    
    CREATE INDEX IF NOT EXISTS idx_monitoring_audit_created_at 
        ON monitoring_audit_log(created_at);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Step 6: Set up RLS
ALTER TABLE message_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE monitoring_audit_log ENABLE ROW LEVEL SECURITY;

-- Step 7: Create policies (idempotent)
DO $$ 
BEGIN
    -- Message queue policies
    CREATE POLICY "Service role can do everything" ON message_queue
        FOR ALL
        TO service_role
        USING (true)
        WITH CHECK (true);

    CREATE POLICY "Users can view own messages" ON message_queue
        FOR SELECT
        TO authenticated
        USING (auth.uid() = user_id);

    -- Monitoring audit log policies
    CREATE POLICY "Service role full access to audit log" ON monitoring_audit_log
        FOR ALL
        TO service_role
        USING (true)
        WITH CHECK (true);

    CREATE POLICY "Staff can view audit log" ON monitoring_audit_log
        FOR SELECT
        TO authenticated
        USING (
            EXISTS (
                SELECT 1 FROM users_secure
                WHERE users_secure.id = auth.uid()
                AND users_secure.role = 'staff'
            )
        );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Step 8: Handle realtime
DO $$ 
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE message_queue;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN undefined_object THEN 
        RAISE NOTICE 'Publication supabase_realtime does not exist';
END $$;

-- Step 9: Add table comments
COMMENT ON TABLE message_queue IS 'Queue for monitoring events';
COMMENT ON TABLE monitoring_audit_log IS 'Audit log for monitoring events';

---- Rollback SQL ----
/*
BEGIN;
    -- Drop policies
    DROP POLICY IF EXISTS "Service role can do everything" ON message_queue;
    DROP POLICY IF EXISTS "Users can view own messages" ON message_queue;
    DROP POLICY IF EXISTS "Service role full access to audit log" ON monitoring_audit_log;
    DROP POLICY IF EXISTS "Staff can view audit log" ON monitoring_audit_log;
    
    -- Remove from realtime
    ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS message_queue;
    
    -- Drop tables
    DROP TABLE IF EXISTS message_queue CASCADE;
    DROP TABLE IF EXISTS monitoring_audit_log CASCADE;
COMMIT;
*/ 