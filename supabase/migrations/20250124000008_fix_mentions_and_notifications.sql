-- Drop existing triggers and constraints
DROP TRIGGER IF EXISTS on_mention ON ticket_activities;
ALTER TABLE ticket_activities DROP CONSTRAINT IF EXISTS ticket_activities_content_check;

-- Add new, less strict check constraint
ALTER TABLE ticket_activities ADD CONSTRAINT ticket_activities_content_check CHECK (
    CASE 
        WHEN activity_type = 'comment' THEN
            content IS NOT NULL
            AND jsonb_typeof(content) = 'object'
            AND content ? 'text'
            AND content ? 'is_internal'
            AND (
                (content->'mentions' IS NULL)
                OR (jsonb_typeof(content->'mentions') = 'array')
            )
        ELSE true
    END
);

-- Update the trigger function to handle content properly
CREATE OR REPLACE FUNCTION create_mention_notifications()
RETURNS TRIGGER AS $$
DECLARE
    mentioned_user_id uuid;
    mentioned_user_role text;
BEGIN
    -- Debug log the incoming data
    RAISE LOG 'MENTIONS DEBUG: Creating mention notifications for activity: %', NEW;
    RAISE LOG 'MENTIONS DEBUG: Content: %', NEW.content;

    -- Process mentions if they exist and are not null
    IF NEW.content ? 'mentions' 
       AND NEW.content->'mentions' IS NOT NULL 
       AND jsonb_array_length(NEW.content->'mentions') > 0 
    THEN
        RAISE LOG 'MENTIONS DEBUG: Processing mentions array: %', NEW.content->'mentions';
        
        FOR mentioned_user_id IN 
            SELECT (mention->>'referenced_id')::uuid
            FROM jsonb_array_elements(NEW.content->'mentions') as mention
            WHERE mention->>'referenced_id' IS NOT NULL
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

-- Recreate the trigger
CREATE TRIGGER on_mention
    AFTER INSERT OR UPDATE OF content ON ticket_activities
    FOR EACH ROW
    WHEN (NEW.activity_type = 'comment')
    EXECUTE FUNCTION create_mention_notifications(); 