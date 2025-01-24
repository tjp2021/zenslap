-- 1. First, save existing data
CREATE TEMP TABLE IF NOT EXISTS temp_activities AS
SELECT * FROM ticket_activities;

CREATE TEMP TABLE IF NOT EXISTS temp_notifications AS
SELECT * FROM notifications;

-- 2. Remove constraints without dropping tables
ALTER TABLE notifications
    DROP CONSTRAINT IF EXISTS notifications_user_id_fkey,
    DROP CONSTRAINT IF EXISTS notifications_activity_id_fkey;

ALTER TABLE ticket_activities
    DROP CONSTRAINT IF EXISTS ticket_activities_actor_id_fkey,
    DROP CONSTRAINT IF EXISTS ticket_activities_ticket_id_fkey;

-- 3. Add proper constraints with explicit names
ALTER TABLE ticket_activities
    ADD CONSTRAINT ta_ticket_id_fkey 
        FOREIGN KEY (ticket_id) 
        REFERENCES tickets(id) 
        ON DELETE CASCADE,
    ADD CONSTRAINT ta_actor_id_fkey 
        FOREIGN KEY (actor_id) 
        REFERENCES users_secure(id) 
        ON DELETE CASCADE;

ALTER TABLE notifications
    ADD CONSTRAINT notif_user_id_fkey 
        FOREIGN KEY (user_id) 
        REFERENCES users_secure(id) 
        ON DELETE CASCADE,
    ADD CONSTRAINT notif_activity_id_fkey 
        FOREIGN KEY (activity_id) 
        REFERENCES ticket_activities(id) 
        ON DELETE CASCADE;

-- 4. Create missing indexes with explicit names
DROP INDEX IF EXISTS idx_ta_ticket_created;
DROP INDEX IF EXISTS idx_ta_actor;
DROP INDEX IF EXISTS idx_notif_user;
DROP INDEX IF EXISTS idx_notif_activity;

CREATE INDEX IF NOT EXISTS idx_ta_ticket_created 
    ON ticket_activities(ticket_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ta_actor 
    ON ticket_activities(actor_id);
CREATE INDEX IF NOT EXISTS idx_notif_user 
    ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notif_activity 
    ON notifications(activity_id);

-- 5. Verify and update data integrity
UPDATE ticket_activities ta
SET actor_id = us.id
FROM users_secure us
WHERE ta.actor_id IS NULL
AND us.id = auth.uid();

-- 6. Add NOT NULL constraints after data is fixed
ALTER TABLE ticket_activities
    ALTER COLUMN actor_id SET NOT NULL,
    ALTER COLUMN ticket_id SET NOT NULL;

ALTER TABLE notifications
    ALTER COLUMN user_id SET NOT NULL,
    ALTER COLUMN activity_id SET NOT NULL;

-- 7. Recreate policies with explicit names
DROP POLICY IF EXISTS "ticket_activities_select_policy" ON ticket_activities;
DROP POLICY IF EXISTS "notifications_select_policy" ON notifications;

CREATE POLICY "ta_select_policy" ON ticket_activities
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users_secure us
            WHERE us.id = auth.uid()
            AND us.role IN ('admin', 'agent')
        )
        OR
        EXISTS (
            SELECT 1 FROM tickets t
            WHERE t.id = ticket_activities.ticket_id
            AND (t.created_by = auth.uid() OR t.assignee = auth.uid())
        )
    );

CREATE POLICY "notif_select_policy" ON notifications
    FOR SELECT USING (user_id = auth.uid());

-- 8. Verify schema cache
SELECT pg_notify('pgrst', 'reload schema');
