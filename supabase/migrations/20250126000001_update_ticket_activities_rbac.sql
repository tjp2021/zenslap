-- Drop existing policies
DROP POLICY IF EXISTS view_ticket_activities ON ticket_activities;
DROP POLICY IF EXISTS insert_ticket_activities ON ticket_activities;
DROP POLICY IF EXISTS delete_ticket_activities ON ticket_activities;

-- Ensure RLS is enabled
ALTER TABLE ticket_activities ENABLE ROW LEVEL SECURITY;

-- View Policy: Controls what activities each role can see
CREATE POLICY view_ticket_activities ON ticket_activities
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM tickets t
            WHERE t.id = ticket_activities.ticket_id
            AND (
                -- Admins see everything
                EXISTS (
                    SELECT 1 FROM users_secure us
                    WHERE us.id = auth.uid()
                    AND us.role = 'admin'
                )
                OR
                -- Agents see all activities
                EXISTS (
                    SELECT 1 FROM users_secure us
                    WHERE us.id = auth.uid()
                    AND us.role = 'agent'
                )
                OR
                -- Regular users see only comments (excluding internal) and status changes for tickets they created
                (
                    EXISTS (
                        SELECT 1 FROM users_secure us
                        WHERE us.id = auth.uid()
                        AND us.role = 'user'
                        AND t.created_by = auth.uid()
                        AND (
                            activity_type = 'status_change'
                            OR (
                                activity_type = 'comment'
                                AND (content->>'is_internal')::boolean IS NOT TRUE
                            )
                        )
                    )
                )
            )
        )
    );

-- Insert Policy: Controls who can create activities
CREATE POLICY insert_ticket_activities ON ticket_activities
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM tickets t
            WHERE t.id = ticket_id
            AND (
                -- Admins can add any activity to any ticket
                EXISTS (
                    SELECT 1 FROM users_secure us
                    WHERE us.id = auth.uid()
                    AND us.role = 'admin'
                )
                OR
                -- Agents can add any activity to any ticket
                EXISTS (
                    SELECT 1 FROM users_secure us
                    WHERE us.id = auth.uid()
                    AND us.role = 'agent'
                )
                OR
                -- Regular users can only add non-internal comments to tickets they created
                (
                    EXISTS (
                        SELECT 1 FROM users_secure us
                        WHERE us.id = auth.uid()
                        AND us.role = 'user'
                        AND t.created_by = auth.uid()
                        AND activity_type = 'comment'
                        AND (content->>'is_internal')::boolean IS NOT TRUE
                    )
                )
            )
        )
    );

-- Delete Policy: Controls who can delete activities
CREATE POLICY delete_ticket_activities ON ticket_activities
    FOR DELETE
    TO authenticated
    USING (
        -- Admins can delete any activity
        EXISTS (
            SELECT 1 FROM users_secure us
            WHERE us.id = auth.uid()
            AND us.role = 'admin'
        )
        OR
        -- Agents can delete their own comments and internal notes
        (
            EXISTS (
                SELECT 1 FROM users_secure us
                WHERE us.id = auth.uid()
                AND us.role = 'agent'
                AND actor_id = auth.uid()
                AND activity_type = 'comment'
            )
        )
        OR
        -- Regular users can delete their own non-internal comments
        (
            EXISTS (
                SELECT 1 FROM users_secure us
                WHERE us.id = auth.uid()
                AND us.role = 'user'
                AND actor_id = auth.uid()
                AND activity_type = 'comment'
                AND (content->>'is_internal')::boolean IS NOT TRUE
            )
        )
    ); 