-- Drop existing policies
DROP POLICY IF EXISTS "view_ticket_activities" ON ticket_activities;
DROP POLICY IF EXISTS "Authenticated users can view all activities" ON ticket_activities;

-- Create new policy that allows staff to view all activities
CREATE POLICY "ticket_activities_select_policy" ON ticket_activities
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM users_secure
    WHERE users_secure.id = auth.uid()
    AND users_secure.role IN ('admin', 'agent')
  )
  OR
  EXISTS (
    SELECT 1 FROM tickets t
    WHERE t.id = ticket_activities.ticket_id
    AND t.created_by = auth.uid()
  )
); 