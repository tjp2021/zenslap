-- Drop existing policies
DROP POLICY IF EXISTS "Users can view all users when authenticated" ON public.users_secure;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users_secure;
DROP POLICY IF EXISTS "Staff can view all users" ON public.users_secure;
DROP POLICY IF EXISTS staff_view_all ON public.users_secure;

-- Create a security definer function to check roles
CREATE OR REPLACE FUNCTION auth.check_user_role()
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM auth.users u 
    WHERE u.id = auth.uid() 
    AND u.raw_app_meta_data->>'role' IN ('admin', 'agent')
  );
END;
$$;

-- Create policy using the security definer function
CREATE POLICY staff_view_all ON public.users_secure
FOR SELECT TO authenticated
USING (
  auth.uid() = id  -- Allow users to see their own profile
  OR auth.check_user_role()  -- Use security definer function for role check
); 