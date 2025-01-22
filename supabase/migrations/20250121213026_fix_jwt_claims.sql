-- Create a function to sync user roles to JWT claims
create or replace function auth.sync_user_role_to_claims()
returns trigger
language plpgsql
security definer
as $$
begin
  -- Update the user's JWT claims when their role changes
  if (tg_op = 'INSERT') or 
     (tg_op = 'UPDATE' and (new.raw_user_meta_data->>'role' is distinct from old.raw_user_meta_data->>'role')) then
    
    -- Set the role claim in the user's JWT
    update auth.users
    set raw_app_meta_data = 
      coalesce(raw_app_meta_data, '{}'::jsonb) || 
      jsonb_build_object('role', new.raw_user_meta_data->>'role')
    where id = new.id;
  end if;
  return new;
end;
$$;

-- Create the trigger
drop trigger if exists sync_user_role_to_claims on auth.users;
create trigger sync_user_role_to_claims
  after insert or update on auth.users
  for each row
  execute procedure auth.sync_user_role_to_claims();

-- Update existing users to sync their roles
update auth.users
set raw_app_meta_data = 
  coalesce(raw_app_meta_data, '{}'::jsonb) || 
  jsonb_build_object('role', raw_user_meta_data->>'role')
where raw_user_meta_data->>'role' is not null; 