-- Drop existing policies
DROP POLICY IF EXISTS view_ticket_activities ON ticket_activities;
DROP POLICY IF EXISTS insert_ticket_activities ON ticket_activities;
DROP POLICY IF EXISTS delete_ticket_activities ON ticket_activities;

-- Ensure RLS is enabled
ALTER TABLE ticket_activities ENABLE ROW LEVEL SECURITY;

-- Create new view policy with precise RBAC
CREATE POLICY view_ticket_activities ON ticket_activities
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM tickets t
            WHERE t.id = ticket_activities.ticket_id
            AND (
                -- Admin sees everything
                EXISTS (
                    SELECT 1 FROM users_secure us
                    WHERE us.id = auth.uid()
                    AND us.role = 'admin'
                )
                OR
                -- Agents see activities for assigned tickets
                (
                    EXISTS (
                        SELECT 1 FROM users_secure us
                        WHERE us.id = auth.uid()
                        AND us.role = 'agent'
                        AND t.assignee = auth.uid()
                    )
                )
                OR
                -- Regular users see only comments and status changes for tickets they created
                (
                    EXISTS (
                        SELECT 1 FROM users_secure us
                        WHERE us.id = auth.uid()
                        AND us.role = 'user'
                        AND t.created_by = auth.uid()
                        AND activity_type IN ('comment', 'status_change')
                        AND (
                            activity_type != 'comment' 
                            OR (content->>'is_internal')::boolean IS NOT TRUE
                        )
                    )
                )
            )
        )
    );

-- Create insert policy
CREATE POLICY insert_ticket_activities ON ticket_activities
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM tickets t
            WHERE t.id = ticket_id
            AND (
                -- Admin can add activities to any ticket
                EXISTS (
                    SELECT 1 FROM users_secure us
                    WHERE us.id = auth.uid()
                    AND us.role = 'admin'
                )
                OR
                -- Agents can add activities to assigned tickets
                (
                    EXISTS (
                        SELECT 1 FROM users_secure us
                        WHERE us.id = auth.uid()
                        AND us.role = 'agent'
                        AND t.assignee = auth.uid()
                    )
                )
                OR
                -- Regular users can only add comments to tickets they created
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

-- Create delete policy
CREATE POLICY delete_ticket_activities ON ticket_activities
    FOR DELETE
    TO authenticated
    USING (
        -- Only admins can delete activities
        EXISTS (
            SELECT 1 FROM users_secure us
            WHERE us.id = auth.uid()
            AND us.role = 'admin'
        )
        OR
        -- Users can delete their own non-internal comments
        (
            actor_id = auth.uid()
            AND activity_type = 'comment'
            AND (content->>'is_internal')::boolean IS NOT TRUE
        )
    ); 