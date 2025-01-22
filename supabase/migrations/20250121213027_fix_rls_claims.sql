-- Drop existing policies
drop policy if exists "Users can view their own data" on auth.users;

-- Create more permissive policies for auth.users
create policy "Users can view their own data"
    on auth.users for select
    using (
        -- Users can always see their own data
        auth.uid() = id
        -- Agents can see customer data
        or (auth.users.raw_app_meta_data->>'role' = 'agent' and exists (
            select 1 from auth.users u where u.id = auth.users.id and u.raw_user_meta_data->>'role' = 'customer'
        ))
        -- Admins can see all data
        or (auth.users.raw_app_meta_data->>'role' = 'admin')
    );

-- Drop and recreate the users view
drop view if exists public.users;
create view public.users with (security_barrier) as
select 
    id,
    email,
    raw_user_meta_data->>'role' as role,
    created_at,
    updated_at,
    last_sign_in_at
from auth.users
where 
    -- Inline the security check
    auth.uid() = id
    -- Agents can see customer data
    or (auth.users.raw_app_meta_data->>'role' = 'agent' and raw_user_meta_data->>'role' = 'customer')
    -- Admins can see all data
    or (auth.users.raw_app_meta_data->>'role' = 'admin');

-- Grant necessary permissions
grant select on public.users to authenticated; 