-- Drop existing policies if any
DROP POLICY IF EXISTS "tickets_select_policy" ON tickets;
DROP POLICY IF EXISTS "tickets_update_policy" ON tickets;
DROP POLICY IF EXISTS "tickets_delete_policy" ON tickets;
DROP POLICY IF EXISTS "tickets_insert_policy" ON tickets;

-- Enable RLS
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;

-- View Policy: Users can view their own tickets, Agents/Admins can view all
CREATE POLICY "tickets_select_policy" ON tickets
  FOR SELECT USING (
    auth.uid() = created_by 
    OR 
    EXISTS (
      SELECT 1 FROM users_secure
      WHERE users_secure.id = auth.uid()
      AND users_secure.role IN ('admin', 'agent')
    )
  );

-- Update Policy: Only Agents/Admins can update tickets
CREATE POLICY "tickets_update_policy" ON tickets
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users_secure
      WHERE users_secure.id = auth.uid()
      AND users_secure.role IN ('admin', 'agent')
    )
  );

-- Delete Policy: Only Admins can delete tickets
CREATE POLICY "tickets_delete_policy" ON tickets
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM users_secure
      WHERE users_secure.id = auth.uid()
      AND users_secure.role = 'admin'
    )
  );

-- Create Policy: Any authenticated user can create tickets
CREATE POLICY "tickets_insert_policy" ON tickets
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
  ); 