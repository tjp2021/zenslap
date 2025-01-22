-- Drop existing hook
drop function if exists auth.custom_access_token_hook(jsonb);

-- Create the auth hook function in public schema
create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  claims jsonb;
  metadata jsonb;
begin
  -- Get the user's metadata
  select raw_app_meta_data into metadata
  from auth.users
  where id = (event->>'user_id')::uuid;

  -- Get existing claims
  claims := event->'claims';
  
  -- Add role to claims
  if metadata->>'role' is not null then
    claims := claims || json_build_object('role', metadata->>'role')::jsonb;
  end if;

  -- Return modified event
  return event || json_build_object('claims', claims)::jsonb;
end;
$$;

-- Grant proper permissions
grant usage on schema public to supabase_auth_admin;
grant execute on function public.custom_access_token_hook to supabase_auth_admin;

-- Revoke unnecessary permissions
revoke execute on function public.custom_access_token_hook from authenticated, anon, public;

-- Create simple view with RLS
create or replace view public.users as
select 
  id,
  email,
  raw_app_meta_data->>'role' as role
from auth.users
where 
  auth.uid() = id -- Users can see themselves
  or 
  auth.jwt()->'app_metadata'->>'role' = 'admin'; -- Admins can see all

-- Grant access to view
grant select on public.users to authenticated; 