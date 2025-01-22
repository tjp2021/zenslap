-- Add missing policies for tickets table
CREATE POLICY insert_tickets ON tickets
    FOR INSERT
    TO authenticated
    WITH CHECK (
        -- Users can create tickets
        auth.uid() IS NOT NULL
    );

CREATE POLICY update_tickets ON tickets
    FOR UPDATE
    TO authenticated
    USING (
        -- Users can update tickets assigned to them
        assignee = auth.uid() OR assignee IS NULL
    );

CREATE POLICY delete_tickets ON tickets
    FOR DELETE
    TO authenticated
    USING (
        -- Users can delete tickets assigned to them
        assignee = auth.uid() OR assignee IS NULL
    );

-- Add UPDATE policy for users_secure table
CREATE POLICY update_users_secure ON users_secure
    FOR UPDATE
    TO authenticated
    USING (
        -- Users can only update their own profile
        id = auth.uid()
    ); 