-- Drop existing update policy if it exists
DROP POLICY IF EXISTS "notifications_update_policy" ON notifications;

-- Create a simple update policy that allows users to update their own notifications
CREATE POLICY "notifications_update_policy" ON notifications
FOR UPDATE TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema'; 