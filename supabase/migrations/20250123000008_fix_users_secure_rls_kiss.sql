-- Clean slate: Drop all existing policies
DROP POLICY IF EXISTS "Users can view all users when authenticated" ON public.users_secure;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users_secure;
DROP POLICY IF EXISTS "Staff can view all users" ON public.users_secure;
DROP POLICY IF EXISTS staff_view_all ON public.users_secure;

-- KISS fix: Use auth.jwt() to check roles without circular dependencies
CREATE POLICY staff_view_all ON public.users_secure
FOR SELECT TO authenticated
USING (
  (auth.jwt() ->> 'role')::text IN ('admin', 'agent')
  OR auth.uid() = id  -- Allow users to see their own profile
); 