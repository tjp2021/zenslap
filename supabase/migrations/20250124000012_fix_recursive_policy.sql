-- Drop the problematic policies
DROP POLICY IF EXISTS "users_secure_ticket_visibility" ON public.users_secure;
DROP POLICY IF EXISTS "users_secure_role_only_visibility" ON public.users_secure;
DROP POLICY IF EXISTS "users_secure_role_column_only" ON public.users_secure;

-- Create a single, non-recursive policy
CREATE POLICY "users_secure_access" ON public.users_secure
FOR SELECT TO authenticated
USING (
  -- Users can see their own profile
  id = auth.uid()
  OR
  -- Everyone can see staff profiles (but we'll use column security to limit what they see)
  role IN ('admin', 'agent')
);

-- Enable RLS
ALTER TABLE public.users_secure ENABLE ROW LEVEL SECURITY;

-- Create a security definer function to safely check if a user is staff
CREATE OR REPLACE FUNCTION auth.is_staff()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users
    JOIN public.users_secure ON users_secure.id = users.id
    WHERE users.id = auth.uid()
    AND users_secure.role IN ('admin', 'agent')
  );
$$; 