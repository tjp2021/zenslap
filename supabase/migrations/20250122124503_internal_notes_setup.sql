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

-- Create policies
CREATE POLICY "view_internal_notes" ON internal_notes
    FOR SELECT
    TO authenticated
    USING (
        -- Users can view notes for tickets they have access to
        EXISTS (
            SELECT 1 FROM tickets t
            WHERE t.id = internal_notes.ticket_id
            AND (t.assignee = auth.uid() OR t.assignee IS NULL)
        )
    );

CREATE POLICY "create_internal_notes" ON internal_notes
    FOR INSERT
    TO authenticated
    WITH CHECK (
        -- Users can create notes for tickets they have access to
        EXISTS (
            SELECT 1 FROM tickets t
            WHERE t.id = ticket_id
            AND (t.assignee = auth.uid() OR t.assignee IS NULL)
        )
    ); 