-- Drop existing trigger and function
DROP TRIGGER IF EXISTS on_mention ON ticket_activities;
DROP FUNCTION IF EXISTS create_mention_notifications();

-- Create the notification trigger function
CREATE OR REPLACE FUNCTION create_mention_notifications()
RETURNS TRIGGER AS $$
BEGIN
    -- Debug logging
    RAISE LOG 'MENTIONS DEBUG: Processing activity: %', NEW;
    RAISE LOG 'MENTIONS DEBUG: mentioned_user_ids: %', NEW.mentioned_user_ids;
    
    -- Create notifications for any staff members who are mentioned
    IF NEW.mentioned_user_ids IS NOT NULL AND array_length(NEW.mentioned_user_ids, 1) > 0 THEN
        RAISE LOG 'MENTIONS DEBUG: Found valid mentions, creating notifications';
        
        INSERT INTO notifications (user_id, activity_id)
        SELECT us.id, NEW.id
        FROM unnest(NEW.mentioned_user_ids) AS mentioned_id
        JOIN users_secure us ON us.id = mentioned_id
        WHERE us.role IN ('ADMIN', 'AGENT');
        
        RAISE LOG 'MENTIONS DEBUG: Notifications created successfully';
    ELSE
        RAISE LOG 'MENTIONS DEBUG: No valid mentions found';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO postgres, authenticated, service_role;
GRANT ALL ON notifications TO postgres, authenticated, service_role;
GRANT ALL ON users_secure TO postgres, authenticated, service_role;
GRANT EXECUTE ON FUNCTION create_mention_notifications() TO postgres, authenticated, service_role;

-- Create trigger for mentions - fires on ANY activity with mentions
CREATE TRIGGER on_mention
    AFTER INSERT OR UPDATE OF mentioned_user_ids ON ticket_activities
    FOR EACH ROW
    WHEN (NEW.activity_type = 'comment')
    EXECUTE FUNCTION create_mention_notifications(); 