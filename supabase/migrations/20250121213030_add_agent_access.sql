-- Drop existing view
drop view if exists users;

-- Recreate view with updated permissions
create or replace view users 
with (security_barrier=true) 
as
  select 
    id,
    email,
    raw_app_meta_data->>'role' as role
  from auth.users
  where (
    auth.uid() = id -- User can see their own data
    or 
    auth.jwt()->>'role' = 'admin' -- Admins can see all
    or
    auth.jwt()->>'role' = 'agent' -- Agents can see all
  );

-- Enable security invoker
alter view users set (security_invoker=true);

-- Grant access to authenticated users
grant select on users to authenticated; 