-- Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    activity_id UUID NOT NULL REFERENCES ticket_activities(id) ON DELETE CASCADE,
    read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read) WHERE NOT read;
CREATE INDEX IF NOT EXISTS idx_notifications_activity ON notifications(activity_id);

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own notifications"
    ON notifications FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
    ON notifications FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Add INSERT policy for the trigger function
CREATE POLICY "System can create notifications"
    ON notifications FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Create updated_at function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON notifications
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- Create trigger function for creating notifications from mentions
CREATE OR REPLACE FUNCTION create_mention_notifications()
RETURNS TRIGGER AS $$
DECLARE
    content_json jsonb;
    mentioned_user_id uuid;
    mentioned_user_role text;
BEGIN
    -- Debug log the incoming data
    RAISE LOG 'MENTIONS DEBUG: Creating mention notifications for activity: %', NEW;
    RAISE LOG 'MENTIONS DEBUG: Content before parsing: %', NEW.content;

    -- Ensure content is treated as JSONB
    content_json := NEW.content;

    -- Debug log the parsed content
    RAISE LOG 'MENTIONS DEBUG: Parsed content_json: %', content_json;
    RAISE LOG 'MENTIONS DEBUG: Has mentions?: %, Number of mentions: %', 
        content_json ? 'mentions',
        CASE WHEN content_json ? 'mentions' 
        THEN jsonb_array_length(content_json->'mentions') 
        ELSE 0 END;

    -- For each mention in the content
    -- Only create notifications for staff members (ADMIN/AGENT)
    IF content_json ? 'mentions' THEN
        RAISE LOG 'MENTIONS DEBUG: Processing mentions array: %', content_json->'mentions';
        
        FOR mentioned_user_id IN 
            SELECT (mention->>'referenced_id')::uuid
            FROM jsonb_array_elements(content_json->'mentions') as mention
        LOOP
            -- Get user role
            SELECT role INTO mentioned_user_role
            FROM users_secure
            WHERE id = mentioned_user_id;
            
            RAISE LOG 'MENTIONS DEBUG: Checking user % with role %', mentioned_user_id, mentioned_user_role;
            
            IF mentioned_user_role IN ('ADMIN', 'AGENT') THEN
                RAISE LOG 'MENTIONS DEBUG: Creating notification for staff user: %', mentioned_user_id;
                
                INSERT INTO notifications (user_id, activity_id)
                VALUES (mentioned_user_id, NEW.id);
                
                RAISE LOG 'MENTIONS DEBUG: Notification created successfully';
            ELSE
                RAISE LOG 'MENTIONS DEBUG: Skipping notification for non-staff user: %', mentioned_user_id;
            END IF;
        END LOOP;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS on_mention ON internal_notes;
DROP TRIGGER IF EXISTS on_mention ON ticket_activities;

-- Create trigger for mentions on internal_notes
CREATE TRIGGER on_mention
    AFTER INSERT OR UPDATE OF content ON internal_notes
    FOR EACH ROW
    EXECUTE FUNCTION create_mention_notifications();

-- Create trigger for mentions on ticket_activities
CREATE TRIGGER on_mention
    AFTER INSERT OR UPDATE OF content ON ticket_activities
    FOR EACH ROW
    WHEN (NEW.activity_type = 'comment')
    EXECUTE FUNCTION create_mention_notifications(); 