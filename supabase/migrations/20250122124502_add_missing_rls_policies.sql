-- Add missing policies for tickets table
DROP POLICY IF EXISTS insert_tickets ON tickets;
CREATE POLICY insert_tickets ON tickets
    FOR INSERT
    TO authenticated
    WITH CHECK (
        -- Users can create tickets
        auth.uid() IS NOT NULL
    );

DROP POLICY IF EXISTS update_tickets ON tickets;
CREATE POLICY update_tickets ON tickets
    FOR UPDATE
    TO authenticated
    USING (
        -- Users can update tickets they created or are assigned to
        auth.uid() = created_by OR auth.uid() = assignee
    )
    WITH CHECK (
        -- Users can update tickets they created or are assigned to
        auth.uid() = created_by OR auth.uid() = assignee
    );

DROP POLICY IF EXISTS delete_tickets ON tickets;
CREATE POLICY delete_tickets ON tickets
    FOR DELETE
    TO authenticated
    USING (
        -- Users can delete tickets they created
        auth.uid() = created_by
    );

-- Add UPDATE policy for users_secure table
CREATE POLICY update_users_secure ON users_secure
    FOR UPDATE
    TO authenticated
    USING (
        -- Users can only update their own profile
        id = auth.uid()
    ); 