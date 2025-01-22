-- Revoke all existing permissions
revoke all on auth.users from anon, authenticated;
revoke all on users from anon, authenticated;

-- Drop existing view
drop view if exists users;

-- Create view with security barrier
create view users 
with (security_barrier=true) 
as
  select 
    id,
    email,
    raw_app_meta_data->>'role' as role
  from auth.users;

-- Grant specific permissions
grant usage on schema auth to authenticated;
grant select on auth.users to authenticated;
grant select on users to authenticated;

-- Create policy on auth.users
create policy "Users can view own data or have elevated role"
on auth.users for select
to authenticated
using (
  id = auth.uid() 
  or 
  auth.role() = 'service_role'
  or
  (select raw_app_meta_data->>'role' from auth.users where id = auth.uid()) in ('admin', 'agent')
); 