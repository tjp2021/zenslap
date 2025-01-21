-- Drop the existing view if it exists
drop view if exists public.users;

-- Drop existing policies if they exist
drop policy if exists "Users can view their own data" on auth.users;
drop policy if exists "Admins can view all user data" on auth.users;

-- Create or replace the public.users view
create or replace view public.users as
select 
    id,
    email,
    raw_user_meta_data->>'full_name' as full_name,
    raw_user_meta_data->>'avatar_url' as avatar_url,
    role,
    created_at,
    updated_at,
    last_sign_in_at
from auth.users;

-- Enable RLS on the view
alter view public.users set (security_invoker = on);

-- Create policies for the view
create policy "Users can view their own data"
    on auth.users for select
    to authenticated
    using (auth.uid() = id);

create policy "Admins can view all user data"
    on auth.users for select
    to authenticated
    using (auth.jwt() ->> 'role' = 'admin');

-- Grant necessary permissions
grant usage on schema public to authenticated;
grant select on public.users to authenticated;
