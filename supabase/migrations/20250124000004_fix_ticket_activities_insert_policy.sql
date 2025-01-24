-- Drop existing insert policy
DROP POLICY IF EXISTS insert_ticket_activities ON ticket_activities;

-- Create new insert policy that allows staff to add activities to any ticket
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