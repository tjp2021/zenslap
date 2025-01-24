-- Drop existing policies and triggers
DROP POLICY IF EXISTS view_ticket_activities ON ticket_activities;
DROP POLICY IF EXISTS insert_ticket_activities ON ticket_activities;
DROP TRIGGER IF EXISTS on_mention ON ticket_activities;
DROP FUNCTION IF EXISTS create_mention_notifications CASCADE;

-- Disable RLS temporarily for the migration
ALTER TABLE ticket_activities DISABLE ROW LEVEL SECURITY;

-- Backup existing data
CREATE TEMP TABLE ticket_activities_backup AS 
SELECT 
    id, 
    ticket_id, 
    actor_id, 
    activity_type,
    content,
    created_at,
    -- Extract mentions into a separate array
    CASE 
        WHEN content->'mentions' IS NOT NULL THEN
            ARRAY(
                SELECT (mention->>'referenced_id')::uuid
                FROM jsonb_array_elements(content->'mentions') AS mention
            )
        ELSE
            ARRAY[]::uuid[]
    END AS mentioned_user_ids
FROM ticket_activities;

-- Drop and recreate table
DROP TABLE ticket_activities CASCADE;

CREATE TABLE ticket_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    actor_id UUID REFERENCES auth.users(id),
    activity_type TEXT NOT NULL CHECK (activity_type IN ('comment', 'status_change', 'field_change', 'assignment')),
    content JSONB NOT NULL,
    mentioned_user_ids UUID[],  -- Completely optional mentions
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Restore data
INSERT INTO ticket_activities (id, ticket_id, actor_id, activity_type, content, mentioned_user_ids, created_at)
SELECT 
    id, 
    ticket_id, 
    actor_id, 
    activity_type,
    content - 'mentions',  -- Remove mentions from content since it's now at root level
    mentioned_user_ids,
    created_at
FROM ticket_activities_backup;

-- Create index
CREATE INDEX idx_ticket_activities_ticket_id_created_at 
    ON ticket_activities(ticket_id, created_at DESC);

-- Create the notification trigger function
CREATE OR REPLACE FUNCTION create_mention_notifications()
RETURNS TRIGGER AS $$
BEGIN
    -- Create notifications for any staff members who are mentioned
    IF NEW.mentioned_user_ids IS NOT NULL THEN
        INSERT INTO notifications (user_id, activity_id)
        SELECT us.id, NEW.id
        FROM unnest(NEW.mentioned_user_ids) AS mentioned_id
        JOIN users_secure us ON us.id = mentioned_id
        WHERE us.role IN ('ADMIN', 'AGENT');
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for mentions - fires on ANY activity with mentions
CREATE TRIGGER on_mention
    AFTER INSERT OR UPDATE OF mentioned_user_ids ON ticket_activities
    FOR EACH ROW
    EXECUTE FUNCTION create_mention_notifications();

-- Enable RLS
ALTER TABLE ticket_activities ENABLE ROW LEVEL SECURITY;

-- Recreate the exact same policies as before
CREATE POLICY view_ticket_activities ON ticket_activities
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM tickets t
            WHERE t.id = ticket_activities.ticket_id
            AND (
                EXISTS (
                    SELECT 1 FROM users_secure us
                    WHERE us.id = auth.uid()
                    AND us.role IN ('ADMIN', 'AGENT')
                )
                OR
                (
                    (t.assignee = auth.uid() OR t.assignee IS NULL)
                    AND
                    (
                        activity_type != 'comment'
                        OR
                        (activity_type = 'comment' AND (content->>'is_internal')::boolean IS NOT TRUE)
                    )
                )
            )
        )
    );

CREATE POLICY insert_ticket_activities ON ticket_activities
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM tickets t
            WHERE t.id = ticket_id
            AND (
                EXISTS (
                    SELECT 1 FROM users_secure us
                    WHERE us.id = auth.uid()
                    AND us.role IN ('ADMIN', 'AGENT')
                )
                OR (t.assignee = auth.uid() OR t.assignee IS NULL)
            )
        )
    ); 