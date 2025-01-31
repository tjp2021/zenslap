-- migrate:up
begin;

-- Step 1: Verify dependencies
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'audit_log'
    ) THEN
        RAISE EXCEPTION 'Dependency not met: public.audit_log table does not exist';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_type 
        WHERE typname = 'audit_action_type'
    ) THEN
        RAISE EXCEPTION 'Dependency not met: public.audit_action_type enum does not exist';
    END IF;
END $$;

-- Step 2: Backup existing data
CREATE TABLE IF NOT EXISTS audit_log_backup AS 
SELECT * FROM audit_log WHERE action_type IS NULL;

-- Step 3: Migrate existing data with proper type casting
UPDATE audit_log SET
    action_type = CASE 
        WHEN event_type = 'crisis_detected' THEN 'create'::public.audit_action_type
        WHEN event_type = 'alert_triggered' THEN 'create'::public.audit_action_type
        WHEN event_type = 'notification_sent' THEN 'create'::public.audit_action_type
        WHEN event_type = 'emergency_contacted' THEN 'escalate'::public.audit_action_type
        WHEN event_type = 'intervention_started' THEN 'create'::public.audit_action_type
        WHEN event_type = 'intervention_completed' THEN 'status_change'::public.audit_action_type
    END,
    metadata = jsonb_build_object(
        'event_type', event_type,
        'event_data', event_data,
        'migrated_at', NOW()
    )
WHERE action_type IS NULL;

-- Step 4: Verification
DO $$ 
DECLARE
    unmigrated_count INTEGER;
    invalid_metadata_count INTEGER;
BEGIN
    -- Check for unmigrated records
    SELECT COUNT(*) INTO unmigrated_count
    FROM audit_log
    WHERE action_type IS NULL;
    
    IF unmigrated_count > 0 THEN
        RAISE EXCEPTION 'Found % unmigrated records', unmigrated_count;
    END IF;
    
    -- Check for invalid metadata
    SELECT COUNT(*) INTO invalid_metadata_count
    FROM audit_log
    WHERE jsonb_typeof(metadata) != 'object';
    
    IF invalid_metadata_count > 0 THEN
        RAISE EXCEPTION 'Found % records with invalid metadata', invalid_metadata_count;
    END IF;
END $$;

commit;

-- migrate:down
begin;

-- Step 1: Restore from backup if needed
INSERT INTO audit_log 
SELECT * FROM audit_log_backup
WHERE id NOT IN (SELECT id FROM audit_log);

-- Step 2: Drop backup table
DROP TABLE IF EXISTS audit_log_backup;

commit; 