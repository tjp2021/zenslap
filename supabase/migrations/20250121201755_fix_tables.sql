-- Create profiles table
create table if not exists public.profiles (
    id uuid references auth.users on delete cascade,
    email text,
    role text,
    primary key (id)
); 