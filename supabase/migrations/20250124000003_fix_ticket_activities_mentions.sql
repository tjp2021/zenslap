-- Drop the existing check constraint
ALTER TABLE ticket_activities DROP CONSTRAINT IF EXISTS ticket_activities_content_check;

-- Add new check constraint that properly handles mentions
ALTER TABLE ticket_activities ADD CONSTRAINT ticket_activities_content_check CHECK (
    CASE 
        WHEN activity_type = 'comment' THEN
            jsonb_typeof(content) = 'object'
            AND (content ? 'text')
            AND (content ? 'is_internal')
            AND (content->>'text' IS NOT NULL)
            AND (content->>'is_internal' IS NOT NULL)
            AND (
                (content->'mentions' IS NULL)
                OR (jsonb_typeof(content->'mentions') = 'array')
            )
        ELSE true
    END
); 