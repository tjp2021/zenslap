-- Create ticket_activities table
CREATE TABLE IF NOT EXISTS ticket_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    actor_id UUID REFERENCES auth.users(id),
    activity_type TEXT NOT NULL CHECK (
        activity_type IN ('comment', 'status_change', 'field_change', 'assignment')
    ),
    content JSONB NOT NULL CHECK (
        CASE 
            WHEN activity_type = 'comment' THEN
                (content ? 'text')
                AND (content ? 'is_internal')
                AND (content ? 'mentions')
                AND jsonb_typeof(content->'mentions') = 'array'
            ELSE true
        END
    ),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for faster lookups by ticket_id and created_at
CREATE INDEX IF NOT EXISTS idx_ticket_activities_ticket_id_created_at 
    ON ticket_activities(ticket_id, created_at DESC);

-- Enable RLS
ALTER TABLE ticket_activities ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS view_ticket_activities ON ticket_activities;

-- Create policy for viewing activities
CREATE POLICY view_ticket_activities ON ticket_activities
    FOR SELECT
    TO authenticated
    USING (
        -- Users can view activities for tickets they have access to
        EXISTS (
            SELECT 1 FROM tickets t
            WHERE t.id = ticket_activities.ticket_id
            AND (
                -- Staff can see everything
                EXISTS (
                    SELECT 1 FROM users_secure us
                    WHERE us.id = auth.uid()
                    AND us.role IN ('admin', 'agent')
                )
                OR
                -- Regular users can only see non-internal content
                (
                    (t.assignee = auth.uid() OR t.assignee IS NULL)
                    AND
                    (
                        -- Either it's not a comment
                        activity_type != 'comment'
                        OR
                        -- Or it's a non-internal comment
                        (activity_type = 'comment' AND (content->>'is_internal')::boolean IS NOT TRUE)
                    )
                )
            )
        )
    );
