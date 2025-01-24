-- Drop and recreate the constraint cleanly
ALTER TABLE notifications 
    DROP CONSTRAINT IF EXISTS notifications_activity_id_fkey CASCADE;

-- Add it back with explicit names and references
ALTER TABLE notifications
    ADD CONSTRAINT notifications_activity_id_fkey 
    FOREIGN KEY (activity_id) REFERENCES ticket_activities(id) ON DELETE CASCADE;

-- Force PostgREST to see the new relationship
NOTIFY pgrst, 'reload schema'; 