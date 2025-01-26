-- Drop ALL foreign key constraints from ALL relevant tables
DO $$ 
BEGIN
    -- Drop ALL constraints from ticket_activities
    EXECUTE (
        SELECT string_agg('ALTER TABLE ticket_activities DROP CONSTRAINT IF EXISTS ' || quote_ident(conname) || ' CASCADE;', E'\n')
        FROM pg_constraint
        WHERE conrelid = 'ticket_activities'::regclass
    );
    
    -- Drop ALL constraints from notifications
    EXECUTE (
        SELECT string_agg('ALTER TABLE notifications DROP CONSTRAINT IF EXISTS ' || quote_ident(conname) || ' CASCADE;', E'\n')
        FROM pg_constraint
        WHERE conrelid = 'notifications'::regclass
    );
END $$;

-- Ensure primary keys exist
ALTER TABLE ticket_activities 
DROP CONSTRAINT IF EXISTS ticket_activities_pkey CASCADE;

ALTER TABLE ticket_activities
ADD CONSTRAINT ticket_activities_pkey 
PRIMARY KEY (id);

ALTER TABLE notifications
DROP CONSTRAINT IF EXISTS notifications_pkey CASCADE;

ALTER TABLE notifications
ADD CONSTRAINT notifications_pkey 
PRIMARY KEY (id);

-- Add back ONLY the essential constraints with EXACT names matching PostgREST expectations
ALTER TABLE ticket_activities
ADD CONSTRAINT ta_ticket_id_fkey 
FOREIGN KEY (ticket_id) 
REFERENCES tickets(id)
ON DELETE CASCADE;

ALTER TABLE ticket_activities
ADD CONSTRAINT ta_actor_id_fkey 
FOREIGN KEY (actor_id) 
REFERENCES users_secure(id)
ON DELETE CASCADE;

ALTER TABLE notifications
ADD CONSTRAINT notifications_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES users_secure(id)
ON DELETE CASCADE;

ALTER TABLE notifications
ADD CONSTRAINT notifications_activity_id_fkey
FOREIGN KEY (activity_id)
REFERENCES ticket_activities(id)
ON DELETE CASCADE;

-- Grant necessary permissions to see relationships
GRANT ALL ON ticket_activities TO authenticated;
GRANT ALL ON notifications TO authenticated;
GRANT ALL ON tickets TO authenticated;
GRANT ALL ON users_secure TO authenticated;

GRANT REFERENCES ON ticket_activities TO authenticated;
GRANT REFERENCES ON notifications TO authenticated;
GRANT REFERENCES ON tickets TO authenticated;
GRANT REFERENCES ON users_secure TO authenticated;

-- Force complete schema cache refresh
NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload config';
NOTIFY pgrst, 'reload privileges';

-- Verify constraints are set correctly
DO $$
DECLARE
    constraint_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO constraint_count
    FROM pg_constraint
    WHERE conrelid = 'ticket_activities'::regclass
    AND contype = 'f';
    
    IF constraint_count != 2 THEN
        RAISE EXCEPTION 'Expected 2 foreign key constraints on ticket_activities, found %', constraint_count;
    END IF;
END $$; 