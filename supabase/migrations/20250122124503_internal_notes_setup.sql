-- Create internal_notes table
CREATE TABLE IF NOT EXISTS internal_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_by UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    mentions TEXT[]
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_internal_notes_ticket_id ON internal_notes(ticket_id);
CREATE INDEX IF NOT EXISTS idx_internal_notes_created_by ON internal_notes(created_by);
CREATE INDEX IF NOT EXISTS idx_internal_notes_mentions ON internal_notes USING GIN (mentions);

-- Enable RLS
ALTER TABLE internal_notes ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "view_internal_notes" ON internal_notes;
DROP POLICY IF EXISTS "create_internal_notes" ON internal_notes;

-- Create policies
CREATE POLICY "staff_view_internal_notes" ON internal_notes
    FOR SELECT
    TO authenticated
    USING (
        -- Only staff (admin/agent) can view internal notes
        EXISTS (
            SELECT 1 FROM users_secure
            WHERE id = auth.uid()
            AND role IN ('admin', 'agent')
        )
    );

CREATE POLICY "staff_create_internal_notes" ON internal_notes
    FOR INSERT
    TO authenticated
    WITH CHECK (
        -- Only staff (admin/agent) can create internal notes
        EXISTS (
            SELECT 1 FROM users_secure
            WHERE id = auth.uid()
            AND role IN ('admin', 'agent')
        )
    ); 