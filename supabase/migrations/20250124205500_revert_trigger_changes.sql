-- Drop the broken trigger and function
DROP TRIGGER IF EXISTS on_mention ON ticket_activities;
DROP FUNCTION IF EXISTS create_mention_notifications();

-- Recreate the trigger function that was working
CREATE OR REPLACE FUNCTION create_mention_notifications()
RETURNS TRIGGER AS $$
BEGIN
    -- Create notifications for any staff members who are mentioned
    IF NEW.content ? 'mentions' AND jsonb_array_length(NEW.content->'mentions') > 0 THEN
        INSERT INTO notifications (user_id, activity_id)
        SELECT us.id, NEW.id
        FROM jsonb_array_elements(NEW.content->'mentions') AS mention
        JOIN users_secure us ON us.id = (mention->>'referenced_id')::uuid
        WHERE us.role IN ('ADMIN', 'AGENT');
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