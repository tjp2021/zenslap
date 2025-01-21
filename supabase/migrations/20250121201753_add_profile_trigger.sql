-- Create a function to handle new user profiles
create or replace function public.handle_new_user()
returns trigger as $$
begin
    insert into public.profiles (id, email, role)
    values (new.id, new.email, new.role);
    return new;
end;
$$ language plpgsql security definer;

-- Create a trigger to call this function after a user is created
create trigger on_auth_user_created
    after insert on auth.users
    for each row execute procedure public.handle_new_user(); 