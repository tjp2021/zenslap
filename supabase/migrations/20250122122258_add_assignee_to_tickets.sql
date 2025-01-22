-- Create tickets table if it doesn't exist
CREATE TABLE IF NOT EXISTS tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'open',
    priority TEXT NOT NULL DEFAULT 'low',
    metadata JSONB DEFAULT '{}',
    tags TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add assignee column
ALTER TABLE tickets 
ADD COLUMN IF NOT EXISTS assignee UUID REFERENCES auth.users(id);

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_tickets_assignee ON tickets(assignee);

-- Add RLS policy for assignee
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view tickets assigned to them" ON tickets;
CREATE POLICY "Users can view tickets assigned to them"
    ON tickets
    FOR SELECT
    TO authenticated
    USING (
        assignee = auth.uid() OR 
        assignee IS NULL
    );
