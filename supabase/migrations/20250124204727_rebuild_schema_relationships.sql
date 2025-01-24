-- Wrap everything in a transaction
BEGIN;

-- Force schema cache refresh at start
NOTIFY pgrst, 'reload config';
NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload privileges';

-- First verify tables exist and have data
DO $$
DECLARE
    activity_count INTEGER;
    notification_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO activity_count FROM ticket_activities;
    SELECT COUNT(*) INTO notification_count FROM notifications;
    
    RAISE NOTICE 'Current data counts - Activities: %, Notifications: %', 
        activity_count, notification_count;
END $$;

-- Temporarily disable RLS
ALTER TABLE IF EXISTS notifications DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS ticket_activities DISABLE ROW LEVEL SECURITY;

-- Drop existing temp tables if they exist
DROP TABLE IF EXISTS ticket_activities_backup;
DROP TABLE IF EXISTS notifications_backup;

-- Backup existing data into temporary tables with counts verification
CREATE TEMP TABLE ticket_activities_backup AS 
SELECT * FROM ticket_activities;

CREATE TEMP TABLE notifications_backup AS 
SELECT * FROM notifications;

-- Verify backup counts match original
DO $$
DECLARE
    original_activity_count INTEGER;
    original_notification_count INTEGER;
    backup_activity_count INTEGER;
    backup_notification_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO original_activity_count FROM ticket_activities;
    SELECT COUNT(*) INTO original_notification_count FROM notifications;
    SELECT COUNT(*) INTO backup_activity_count FROM ticket_activities_backup;
    SELECT COUNT(*) INTO backup_notification_count FROM notifications_backup;
    
    IF original_activity_count != backup_activity_count OR 
       original_notification_count != backup_notification_count THEN
        RAISE EXCEPTION 'Backup verification failed! Original counts (A: %, N: %) != Backup counts (A: %, N: %)',
            original_activity_count, original_notification_count,
            backup_activity_count, backup_notification_count;
    END IF;
    
    RAISE NOTICE 'Backup verification successful - Activities: %, Notifications: %',
        backup_activity_count, backup_notification_count;
END $$;

-- Drop existing tables to ensure clean slate
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS ticket_activities CASCADE;

-- First create tables without foreign key constraints
CREATE TABLE ticket_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL,
    actor_id UUID NOT NULL,
    activity_type TEXT NOT NULL CHECK (activity_type IN ('comment', 'status_change', 'field_change', 'assignment')),
    content JSONB NOT NULL,
    mentioned_user_ids UUID[] DEFAULT array[]::uuid[],
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    activity_id UUID NOT NULL,
    read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Now add foreign key constraints
ALTER TABLE ticket_activities
    ADD CONSTRAINT ticket_activities_ticket_id_fkey 
        FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE,
    ADD CONSTRAINT ticket_activities_actor_id_fkey 
        FOREIGN KEY (actor_id) REFERENCES users_secure(id) ON DELETE CASCADE;

ALTER TABLE notifications
    ADD CONSTRAINT notifications_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES users_secure(id) ON DELETE CASCADE,
    ADD CONSTRAINT notifications_activity_id_fkey 
        FOREIGN KEY (activity_id) REFERENCES ticket_activities(id) ON DELETE CASCADE;

-- Restore data with validation
DO $$
DECLARE
    invalid_tickets BIGINT;
    invalid_users BIGINT;
    invalid_activities BIGINT;
    restored_activity_count INTEGER;
    restored_notification_count INTEGER;
    original_activity_count INTEGER;
    original_notification_count INTEGER;
BEGIN
    -- Get original counts from backups
    SELECT COUNT(*) INTO original_activity_count FROM ticket_activities_backup;
    SELECT COUNT(*) INTO original_notification_count FROM notifications_backup;
    
    -- Check for any ticket_activities records that would violate foreign keys
    SELECT COUNT(*) INTO invalid_tickets
    FROM ticket_activities_backup ta
    WHERE NOT EXISTS (SELECT 1 FROM tickets t WHERE t.id = ta.ticket_id);
    
    SELECT COUNT(*) INTO invalid_users
    FROM ticket_activities_backup ta
    WHERE NOT EXISTS (SELECT 1 FROM users_secure u WHERE u.id = ta.actor_id);
    
    IF invalid_tickets > 0 OR invalid_users > 0 THEN
        RAISE EXCEPTION 'Data validation failed. Invalid tickets: %, Invalid users: %', 
            invalid_tickets, invalid_users;
    END IF;
    
    -- Restore ticket_activities with validated data
    INSERT INTO ticket_activities 
    SELECT * FROM ticket_activities_backup;
    
    -- Verify ticket_activities restoration
    SELECT COUNT(*) INTO restored_activity_count FROM ticket_activities;
    IF restored_activity_count != original_activity_count THEN
        RAISE EXCEPTION 'Activity restoration verification failed! Original: %, Restored: %',
            original_activity_count, restored_activity_count;
    END IF;
    
    -- Check for any notifications records that would violate foreign keys
    SELECT COUNT(*) INTO invalid_activities
    FROM notifications_backup n
    WHERE NOT EXISTS (SELECT 1 FROM ticket_activities ta WHERE ta.id = n.activity_id)
       OR NOT EXISTS (SELECT 1 FROM users_secure u WHERE u.id = n.user_id);
    
    IF invalid_activities > 0 THEN
        RAISE EXCEPTION 'Data validation failed. Invalid notification references: %', 
            invalid_activities;
    END IF;
    
    -- Restore notifications with validated data
    INSERT INTO notifications 
    SELECT * FROM notifications_backup;
    
    -- Verify notifications restoration
    SELECT COUNT(*) INTO restored_notification_count FROM notifications;
    IF restored_notification_count != original_notification_count THEN
        RAISE EXCEPTION 'Notification restoration verification failed! Original: %, Restored: %',
            original_notification_count, restored_notification_count;
    END IF;
    
    RAISE NOTICE 'Data restoration completed successfully - Activities: %, Notifications: %',
        restored_activity_count, restored_notification_count;
END $$;

-- Create indexes for performance
CREATE INDEX idx_ticket_activities_ticket_id ON ticket_activities(ticket_id);
CREATE INDEX idx_ticket_activities_actor_id ON ticket_activities(actor_id);
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_activity_id ON notifications(activity_id);

-- Re-enable RLS
ALTER TABLE ticket_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Force another schema cache refresh after structure changes
NOTIFY pgrst, 'reload config';
NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload privileges';

-- Recreate RLS policies
CREATE POLICY "ticket_activities_select_policy" ON ticket_activities
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM users_secure
        WHERE users_secure.id = auth.uid()
        AND users_secure.role IN ('admin', 'agent')
    )
    OR
    EXISTS (
        SELECT 1 FROM tickets t
        WHERE t.id = ticket_activities.ticket_id
        AND t.created_by = auth.uid()
    )
);

CREATE POLICY "notifications_select_policy" ON notifications
FOR SELECT USING (auth.uid() = user_id);

-- Grant necessary permissions
GRANT ALL ON ticket_activities TO authenticated;
GRANT ALL ON notifications TO authenticated;

-- CRITICAL: Grant permissions to PostgREST to see the relationships
GRANT REFERENCES ON ticket_activities TO authenticated;
GRANT REFERENCES ON notifications TO authenticated;
GRANT REFERENCES ON users_secure TO authenticated;
GRANT REFERENCES ON tickets TO authenticated;

-- Grant usage on the schema
GRANT USAGE ON SCHEMA public TO authenticated;

-- Final verification of counts
DO $$
DECLARE
    final_activity_count INTEGER;
    final_notification_count INTEGER;
    backup_activity_count INTEGER;
    backup_notification_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO backup_activity_count FROM ticket_activities_backup;
    SELECT COUNT(*) INTO backup_notification_count FROM notifications_backup;
    SELECT COUNT(*) INTO final_activity_count FROM ticket_activities;
    SELECT COUNT(*) INTO final_notification_count FROM notifications;
    
    IF final_activity_count != backup_activity_count OR 
       final_notification_count != backup_notification_count THEN
        RAISE EXCEPTION 'Final verification failed! Backup (A: %, N: %) != Final (A: %, N: %)',
            backup_activity_count, backup_notification_count,
            final_activity_count, final_notification_count;
    END IF;
    
    RAISE NOTICE 'Migration completed successfully with all data preserved';
END $$;

-- Final schema cache refresh
NOTIFY pgrst, 'reload config';
NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload privileges';

-- If we got here, everything worked, so commit the transaction
COMMIT;
