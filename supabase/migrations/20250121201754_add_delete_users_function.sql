-- Function to delete all users and their related data
create or replace function delete_all_users()
returns void
language plpgsql
security definer
as $$
begin
    -- Delete from profiles first (due to foreign key constraint)
    delete from profiles;
    
    -- Delete from auth.users
    delete from auth.users;
end;
$$; 