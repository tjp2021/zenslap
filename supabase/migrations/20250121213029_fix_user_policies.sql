-- Drop existing view if exists
drop view if exists users;

-- Create view with security barrier
create or replace view users 
with (security_barrier=true) 
as
  select 
    id,
    email,
    raw_app_meta_data->>'role' as role
  from auth.users
  where (
    auth.uid() = id 
    or 
    auth.jwt()->>'role' = 'admin'
  );

-- Enable security invoker
alter view users set (security_invoker=true);

-- Grant access to authenticated users
grant select on users to authenticated; 