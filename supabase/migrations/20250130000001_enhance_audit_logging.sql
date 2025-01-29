-- migrate:up
begin;

-- 1. Backup existing data
CREATE TABLE IF NOT EXISTS audit_log_backup AS 
SELECT * FROM audit_log;

-- 2. Migrate existing data
UPDATE audit_log SET
    action_type = CASE 
        WHEN event_type = 'crisis_detected' THEN 'create'
        WHEN event_type = 'alert_triggered' THEN 'create'
        WHEN event_type = 'notification_sent' THEN 'create'
        WHEN event_type = 'emergency_contacted' THEN 'escalate'
        WHEN event_type = 'intervention_started' THEN 'create'
        WHEN event_type = 'intervention_completed' THEN 'status_change'
    END,
    metadata = jsonb_build_object(
        'event_type', event_type,
        'event_data', event_data,
        'migrated_at', NOW()
    )
WHERE action_type IS NULL;

-- 3. Verification: Check if everything was migrated correctly
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

-- Restore from backup if needed
INSERT INTO audit_log 
SELECT * FROM audit_log_backup
WHERE id NOT IN (SELECT id FROM audit_log);

-- Drop backup table
DROP TABLE IF EXISTS audit_log_backup;

commit; 