-- Drop existing trigger and function
DROP TRIGGER IF EXISTS on_mention ON ticket_activities;
DROP FUNCTION IF EXISTS create_mention_notifications();

-- Create the notification trigger function with debug logging
CREATE OR REPLACE FUNCTION create_mention_notifications()
RETURNS TRIGGER AS $$
DECLARE
    staff_count INTEGER;
BEGIN
    RAISE LOG '[MENTIONS] -------- START --------';
    RAISE LOG '[MENTIONS] Activity ID: %, Type: %, Content: %', NEW.id, NEW.activity_type, NEW.content;
    RAISE LOG '[MENTIONS] Mentioned User IDs: %', NEW.mentioned_user_ids;

    -- Log the staff users that would be notified
    SELECT COUNT(*) INTO staff_count
    FROM unnest(NEW.mentioned_user_ids) AS mentioned_id
    JOIN users_secure us ON us.id = mentioned_id
    WHERE us.role IN ('ADMIN', 'AGENT');
    
    RAISE LOG '[MENTIONS] Found % staff members to notify', staff_count;

    -- Create notifications for any staff members who are mentioned
    IF NEW.mentioned_user_ids IS NOT NULL AND array_length(NEW.mentioned_user_ids, 1) > 0 THEN
        INSERT INTO notifications (user_id, activity_id)
        SELECT us.id, NEW.id
        FROM unnest(NEW.mentioned_user_ids) AS mentioned_id
        JOIN users_secure us ON us.id = mentioned_id
        WHERE us.role IN ('ADMIN', 'AGENT')
        RETURNING id, user_id, activity_id;
        
        GET DIAGNOSTICS staff_count = ROW_COUNT;
        RAISE LOG '[MENTIONS] Created % notifications', staff_count;
    END IF;

    RAISE LOG '[MENTIONS] -------- END --------';
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for mentions - fires on ANY activity with mentions
CREATE TRIGGER on_mention
    AFTER INSERT OR UPDATE OF mentioned_user_ids ON ticket_activities
    FOR EACH ROW
    WHEN (NEW.activity_type = 'comment')
    EXECUTE FUNCTION create_mention_notifications(); 