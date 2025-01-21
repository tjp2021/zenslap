-- Drop role management function
drop function if exists manage_user_role(uuid, user_role);

-- Remove role column from auth.users
alter table if exists auth.users drop column if exists role;

-- Drop role enum
drop type if exists user_role; 