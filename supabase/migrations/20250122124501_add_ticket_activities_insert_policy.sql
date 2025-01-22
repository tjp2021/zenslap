-- Add INSERT policy for ticket activities
CREATE POLICY insert_ticket_activities ON ticket_activities
    FOR INSERT
    TO authenticated
    WITH CHECK (
        -- Users can add activities to tickets they have access to
        EXISTS (
            SELECT 1 FROM tickets t
            WHERE t.id = ticket_activities.ticket_id
            AND (t.assignee = auth.uid() OR t.assignee IS NULL)
        )
    );

-- Add DELETE policy for ticket activities
CREATE POLICY delete_ticket_activities ON ticket_activities
    FOR DELETE
    TO authenticated
    USING (
        -- Users can only delete their own activities
        actor_id = auth.uid()
    ); 