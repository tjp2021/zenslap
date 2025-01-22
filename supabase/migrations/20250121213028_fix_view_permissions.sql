-- First, ensure we're working in the public schema
set search_path to public;

-- Drop the existing view
drop view if exists users;

-- Create the view in public schema
create view users as
select 
    id,
    email,
    raw_user_meta_data->>'role' as role,
    created_at,
    updated_at,
    last_sign_in_at
from auth.users;

-- Enable RLS on the view
alter view users set (security_barrier = true);

-- Create policy for the underlying table
drop policy if exists "Users can view their own data" on auth.users;
create policy "Users can view their own data"
    on auth.users for select
    using (
        auth.uid() = id
        or exists (
            select 1 
            from auth.users u 
            where u.id = auth.uid()
            and (
                -- User can see their own data
                auth.uid() = id
                -- Agents can see customer data
                or (u.raw_user_meta_data->>'role' = 'agent' 
                    and auth.users.raw_user_meta_data->>'role' = 'customer')
                -- Admins can see all data
                or u.raw_user_meta_data->>'role' = 'admin'
            )
        )
    );

-- Grant permissions
grant usage on schema public to authenticated;
grant select on public.users to authenticated;
grant select on auth.users to authenticated; 