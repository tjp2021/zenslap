-- Drop existing policies if any
DROP POLICY IF EXISTS "view_ticket_activities" ON ticket_activities;
DROP POLICY IF EXISTS "insert_ticket_activities" ON ticket_activities;
DROP POLICY IF EXISTS "delete_ticket_activities" ON ticket_activities;

-- Enable RLS
ALTER TABLE ticket_activities ENABLE ROW LEVEL SECURITY;

-- View Policy: Staff can see everything, users can see non-internal content
CREATE POLICY view_ticket_activities ON ticket_activities
    FOR SELECT
    TO authenticated
    USING (
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

-- Insert Policy: Staff can add activities to any ticket, users only to their tickets
CREATE POLICY insert_ticket_activities ON ticket_activities
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM tickets t
            WHERE t.id = ticket_activities.ticket_id
            AND (
                -- Staff can add activities to any ticket
                EXISTS (
                    SELECT 1 FROM users_secure us
                    WHERE us.id = auth.uid()
                    AND us.role IN ('admin', 'agent')
                )
                OR
                -- Regular users can only add to their assigned tickets
                (t.assignee = auth.uid() OR t.assignee IS NULL)
            )
        )
    );

-- Delete Policy: Users can only delete their own activities
CREATE POLICY delete_ticket_activities ON ticket_activities
    FOR DELETE
    TO authenticated
    USING (
        -- Users can only delete their own activities
        actor_id = auth.uid()
    ); 