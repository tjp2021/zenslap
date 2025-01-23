-- Enable RLS
alter table users_secure enable row level security;

-- Drop existing policies if they exist
drop policy if exists "Users can view their own profile" on users_secure;
drop policy if exists "Staff can view all users" on users_secure;

-- First iteration: Simple JWT-based policy
DROP POLICY IF EXISTS "Users can view all users when authenticated" ON public.users_secure;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users_secure;
DROP POLICY IF EXISTS "Staff can view all users" ON public.users_secure;
DROP POLICY IF EXISTS staff_view_all ON public.users_secure;

CREATE POLICY staff_view_all ON public.users_secure
FOR SELECT TO authenticated
USING (
  (auth.jwt() ->> 'role')::text IN ('admin', 'agent')
);

-- Create policies
create policy "Users can view their own profile"
on users_secure for select
to authenticated
using (
  auth.uid() = id
);

create policy "Staff can view all users"
on users_secure for select
to authenticated
using (
  exists (
    select 1 
    from users_secure 
    where id = auth.uid() 
    and role in ('ADMIN', 'AGENT')
  )
); 