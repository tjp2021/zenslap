-- Create the auth hook function
create or replace function auth.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  claims jsonb;
  user_role text;
begin
  -- Get the role from raw_app_meta_data
  select raw_app_meta_data->>'role'
  into user_role
  from auth.users
  where id = (event->>'sub')::uuid;

  claims := event->'claims';
  
  -- Set the role claim
  if user_role is not null then
    claims := jsonb_set(claims, '{role}', to_jsonb(user_role));
  end if;

  -- Update the claims in the event
  return jsonb_set(event, '{claims}', claims);
end;
$$;

-- Grant required permissions
grant execute on function auth.custom_access_token_hook to supabase_auth_admin;

-- Enable RLS on auth.users
alter table auth.users enable row level security;

-- Create policy for auth.users
create policy "Users can see themselves and admins can see all"
on auth.users for select
to authenticated
using (
  id = auth.uid() 
  or 
  (auth.jwt()->>'role' = 'admin')
);

-- Create public view with RLS
create or replace view public.users as
select 
  id,
  email,
  raw_app_meta_data->>'role' as role
from auth.users;

-- Enable RLS on the view
alter view public.users set (security_barrier = true);

-- Grant access to the view
grant select on public.users to authenticated; 