-- Drop existing policies
DROP POLICY IF EXISTS "Users can view all users when authenticated" ON public.users_secure;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users_secure;
DROP POLICY IF EXISTS "Staff can view all users" ON public.users_secure;
DROP POLICY IF EXISTS staff_view_all ON public.users_secure;

-- Create the correct policy using the same pattern as tickets
CREATE POLICY staff_view_all ON public.users_secure
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users_secure
    WHERE id = auth.uid()
    AND role IN ('admin', 'agent')
  )
); 