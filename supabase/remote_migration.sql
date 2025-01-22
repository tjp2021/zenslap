-- Check if table exists and create if not
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'tickets') THEN
        CREATE TABLE public.tickets (
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
    END IF;
END
$$;

-- Add assignee column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'tickets' 
        AND column_name = 'assignee'
    ) THEN
        ALTER TABLE public.tickets 
        ADD COLUMN assignee UUID REFERENCES auth.users(id);
    END IF;
END
$$;

-- Add index if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE schemaname = 'public' 
        AND tablename = 'tickets' 
        AND indexname = 'idx_tickets_assignee'
    ) THEN
        CREATE INDEX idx_tickets_assignee ON public.tickets(assignee);
    END IF;
END
$$;

-- Enable RLS
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Users can view tickets assigned to them" ON public.tickets;

-- Create new policy
CREATE POLICY "Users can view tickets assigned to them"
    ON public.tickets
    FOR SELECT
    TO authenticated
    USING (
        assignee = auth.uid() OR 
        assignee IS NULL
    ); 