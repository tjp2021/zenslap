-- Drop existing view
drop view if exists users;

-- Create debug function
create or replace function auth.debug_role(out result text)
language plpgsql
as $$
begin
  raise log 'Current auth.uid(): %', auth.uid();
  raise log 'Current user metadata: %', (select raw_app_meta_data from auth.users where id = auth.uid());
  result := 'logged';
end;
$$;

-- Recreate view with debug logging
create or replace view users 
with (security_barrier=true) 
as
select u.id,
       u.email,
       u.raw_app_meta_data->>'role' as role,
       auth.debug_role() as _debug
from auth.users u
where true;  -- Temporarily allow all access for debugging

-- Enable security invoker
alter view users set (security_invoker=true);

-- Grant access to authenticated users
grant select on users to authenticated; 