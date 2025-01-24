-- Drop the overcomplicated trigger and function
DROP TRIGGER IF EXISTS on_mention ON ticket_activities;
DROP FUNCTION IF EXISTS create_mention_notifications();

-- Create a simple trigger function that uses the mentioned_user_ids array
CREATE OR REPLACE FUNCTION create_mention_notifications()
RETURNS TRIGGER AS $$
BEGIN
    -- If there are mentioned users, create notifications for staff members
    IF NEW.mentioned_user_ids IS NOT NULL THEN
        INSERT INTO notifications (user_id, activity_id)
        SELECT us.id, NEW.id
        FROM unnest(NEW.mentioned_user_ids) AS mentioned_id
        JOIN users_secure us ON us.id = mentioned_id
        WHERE us.role IN ('ADMIN', 'AGENT');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger that watches the mentioned_user_ids column
CREATE TRIGGER on_mention
    AFTER INSERT OR UPDATE OF mentioned_user_ids ON ticket_activities
    FOR EACH ROW
    WHEN (NEW.activity_type = 'comment')
    EXECUTE FUNCTION create_mention_notifications(); 