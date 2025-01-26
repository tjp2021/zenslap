-- Fix PostgREST relationship issues
-- 1. Drop all existing constraints to start fresh
DO $$ 
BEGIN
    EXECUTE (
        SELECT string_agg('ALTER TABLE ticket_activities DROP CONSTRAINT IF EXISTS ' || quote_ident(conname) || ' CASCADE;', E'\n')
        FROM pg_constraint
        WHERE conrelid = 'ticket_activities'::regclass
    );
END $$;

-- 2. Add primary key with exact name
ALTER TABLE ticket_activities 
ADD CONSTRAINT ticket_activities_pkey 
PRIMARY KEY (id);

-- 3. Add foreign keys with exact PostgREST-expected names
ALTER TABLE ticket_activities
ADD CONSTRAINT ticket_activities_ticket_id_fkey 
FOREIGN KEY (ticket_id) 
REFERENCES tickets(id)
ON DELETE CASCADE;

ALTER TABLE ticket_activities
ADD CONSTRAINT ticket_activities_actor_id_fkey 
FOREIGN KEY (actor_id) 
REFERENCES users_secure(id)
ON DELETE CASCADE;

-- 4. Grant necessary permissions
GRANT ALL ON ticket_activities TO authenticated;
GRANT REFERENCES ON ticket_activities TO authenticated;
GRANT ALL ON tickets TO authenticated;
GRANT REFERENCES ON tickets TO authenticated;

-- 5. Clear existing policies
DROP POLICY IF EXISTS view_ticket_activities ON ticket_activities;
DROP POLICY IF EXISTS insert_ticket_activities ON ticket_activities;
DROP POLICY IF EXISTS delete_ticket_activities ON ticket_activities;

-- 6. Add proper RLS policies
CREATE POLICY view_ticket_activities ON ticket_activities
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM tickets t
            WHERE t.id = ticket_activities.ticket_id
            AND (
                EXISTS (
                    SELECT 1 FROM users_secure us
                    WHERE us.id = auth.uid()
                    AND us.role IN ('admin', 'agent')
                )
                OR (t.assignee = auth.uid() OR t.assignee IS NULL)
            )
        )
    );

CREATE POLICY insert_ticket_activities ON ticket_activities
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM tickets t
            WHERE t.id = ticket_id
            AND (
                EXISTS (
                    SELECT 1 FROM users_secure us
                    WHERE us.id = auth.uid()
                    AND us.role IN ('admin', 'agent')
                )
                OR (t.assignee = auth.uid() OR t.assignee IS NULL)
            )
        )
    );

-- 7. Force schema cache refresh
NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload config';
NOTIFY pgrst, 'reload privileges';

-- 8. Verify constraints
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