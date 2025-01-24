-- Drop existing policies
DROP POLICY IF EXISTS view_ticket_activities ON ticket_activities;

-- Create updated policy for viewing activities
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