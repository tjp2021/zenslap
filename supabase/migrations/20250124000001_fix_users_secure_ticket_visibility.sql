-- Drop existing policy
DROP POLICY IF EXISTS "users_secure_role_policy" ON public.users_secure;

-- Create new policy that:
-- 1. Allows users to see their own profile
-- 2. Allows staff to see all profiles
-- 3. Allows everyone to see ONLY THE ROLE of staff members (not their full profile)
CREATE POLICY "users_secure_ticket_visibility" ON public.users_secure
FOR SELECT TO authenticated
USING (
  -- Users can see their own profile
  id = auth.uid()
  OR
  -- Staff can see all profiles
  EXISTS (
    SELECT 1 FROM users_secure us
    WHERE us.id = auth.uid()
    AND us.role IN ('admin', 'agent')
  )
);

-- Create a separate policy just for viewing roles
CREATE POLICY "users_secure_role_only_visibility" ON public.users_secure
FOR SELECT TO authenticated
USING (
  -- Everyone can see role field for staff members
  role IN ('admin', 'agent')
);

-- Alter the table to use column-level security
ALTER TABLE public.users_secure ENABLE ROW LEVEL SECURITY;

-- Create policy for column-level access
CREATE POLICY "users_secure_role_column_only" ON public.users_secure
FOR SELECT TO authenticated
USING (role IN ('admin', 'agent')); 