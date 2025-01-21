-- Create profiles table that mirrors auth.users
create table if not exists profiles (
    id uuid references auth.users(id) on delete cascade primary key,
    email text not null,
    role user_role not null default 'customer',
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- Enable RLS
alter table profiles enable row level security;

-- Create policies
create policy "Public profiles are viewable by everyone"
    on profiles for select
    to authenticated
    using (true);

create policy "Users can insert their own profile"
    on profiles for insert
    to authenticated
    with check (auth.uid() = id);

create policy "Users can update own profile"
    on profiles for update
    to authenticated
    using (auth.uid() = id);

-- Create trigger to update updated_at
create trigger handle_updated_at before update on profiles
    for each row execute procedure update_updated_at_column(); 