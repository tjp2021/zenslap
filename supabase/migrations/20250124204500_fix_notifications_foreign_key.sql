-- Drop existing foreign key constraints if they exist
ALTER TABLE notifications
DROP CONSTRAINT IF EXISTS notifications_user_id_fkey,
DROP CONSTRAINT IF EXISTS notifications_activity_id_fkey;

-- Add foreign key constraints
ALTER TABLE notifications
ADD CONSTRAINT notifications_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES users_secure(id) ON DELETE CASCADE,
ADD CONSTRAINT notifications_activity_id_fkey 
    FOREIGN KEY (activity_id) REFERENCES ticket_activities(id) ON DELETE CASCADE;
