-- Drop the existing check constraint
ALTER TABLE ticket_activities DROP CONSTRAINT IF EXISTS ticket_activities_content_check;

-- Add new check constraint for just text and is_internal
ALTER TABLE ticket_activities ADD CONSTRAINT ticket_activities_content_check CHECK (
    CASE 
        WHEN activity_type = 'comment' THEN
            jsonb_typeof(content::jsonb) = 'object'
            AND (content::jsonb ? 'text')
            AND (content::jsonb ? 'is_internal')
            AND ((content::jsonb)->>'text' IS NOT NULL)
            AND ((content::jsonb)->>'is_internal' IS NOT NULL)
        ELSE true
    END
); 