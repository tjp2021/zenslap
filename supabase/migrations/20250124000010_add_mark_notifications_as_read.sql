-- Drop existing function if it exists
DROP FUNCTION IF EXISTS public.mark_notifications_as_read(uuid, uuid[]);

-- Create stored procedure to mark notifications as read
CREATE OR REPLACE FUNCTION public.mark_notifications_as_read(user_id uuid, notification_ids uuid[])
RETURNS void AS $$
DECLARE
    update_count integer;
BEGIN
    -- Log which notifications we're updating
    RAISE LOG 'Marking notifications as read for user %, notifications: %', user_id, notification_ids;
    
    -- Update notifications
    WITH updated AS (
        UPDATE notifications n
        SET read = true
        WHERE n.user_id = user_id
        AND n.id = ANY(notification_ids)
        RETURNING n.id
    )
    SELECT COUNT(*) INTO update_count FROM updated;
    
    -- Log how many were updated
    RAISE LOG 'Updated % notifications', update_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.mark_notifications_as_read(uuid, uuid[]) TO authenticated; 