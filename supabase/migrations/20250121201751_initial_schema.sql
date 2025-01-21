-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Create user_role enum if it doesn't exist
do $$ 
begin
    if not exists (select 1 from pg_type where typname = 'user_role') then
        create type user_role as enum ('admin', 'agent', 'customer');
    end if;
end $$;

-- Add role to auth.users if it doesn't exist
do $$ 
begin
    if not exists (select 1 from information_schema.columns where table_schema = 'auth' and table_name = 'users' and column_name = 'role') then
        alter table auth.users add column role user_role not null default 'customer';
    end if;
end $$;

-- Create a view to expose auth.users in public schema
create or replace view public.users as
select 
    id,
    email,
    role,
    created_at,
    updated_at,
    last_sign_in_at
from auth.users;

-- Enable RLS on the users view to inherit policies from auth.users
alter view public.users set (security_invoker = on);

-- Create policies for auth.users
drop policy if exists "Users can view their own data" on auth.users;
create policy "Users can view their own data"
    on auth.users for select
    to authenticated
    using (auth.uid() = id);

drop policy if exists "Admins can view all user data" on auth.users;
create policy "Admins can view all user data"
    on auth.users for select
    to authenticated
    using (auth.jwt() ->> 'role' = 'admin');

-- Create tickets table
create table if not exists tickets (
    id uuid default uuid_generate_v4() primary key,
    title text not null,
    description text not null,
    status text not null default 'open' check (status in ('open', 'in_progress', 'resolved', 'closed')),
    priority text not null default 'medium' check (priority in ('low', 'medium', 'high', 'urgent')),
    metadata jsonb not null default '{}'::jsonb,
    created_by uuid not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- Create tags table
create table tags (
    id uuid default uuid_generate_v4() primary key,
    name text not null,
    color text,
    created_at timestamptz not null default now(),
    unique(name)
);

-- Create ticket_tags junction table
create table ticket_tags (
    ticket_id uuid not null references tickets(id) on delete cascade,
    tag_id uuid not null references tags(id) on delete cascade,
    created_at timestamptz not null default now(),
    primary key (ticket_id, tag_id)
);

-- Create internal_notes table
create table internal_notes (
    id uuid default uuid_generate_v4() primary key,
    ticket_id uuid not null references tickets(id) on delete cascade,
    content text not null,
    created_by uuid not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- Create ticket_messages table
create table ticket_messages (
    id uuid default uuid_generate_v4() primary key,
    ticket_id uuid not null references tickets(id) on delete cascade,
    content text not null,
    type text not null check (type in ('customer', 'agent')),
    created_by uuid not null,
    created_at timestamptz not null default now()
);

-- Create response_categories table
create table response_categories (
    id uuid default uuid_generate_v4() primary key,
    name text not null,
    description text,
    created_at timestamptz not null default now(),
    created_by uuid not null,
    unique(name),
    constraint fk_created_by foreign key (created_by) references auth.users(id)
);

-- Create quick_responses table
create table quick_responses (
    id uuid default uuid_generate_v4() primary key,
    category_id uuid not null references response_categories(id) on delete cascade,
    title text not null,
    content text not null,
    variables jsonb not null default '[]'::jsonb,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    created_by uuid not null,
    constraint fk_created_by foreign key (created_by) references auth.users(id)
);

-- Add indexes
create index tickets_status_idx on tickets(status);
create index tickets_priority_idx on tickets(priority);
create index tickets_created_at_idx on tickets(created_at);
create index tickets_created_by_idx on tickets(created_by);
create index ticket_tags_ticket_id_idx on ticket_tags(ticket_id);
create index ticket_tags_tag_id_idx on ticket_tags(tag_id);
create index internal_notes_ticket_id_idx on internal_notes(ticket_id);
create index internal_notes_created_at_idx on internal_notes(created_at);
create index ticket_messages_ticket_id_idx on ticket_messages(ticket_id);
create index ticket_messages_created_at_idx on ticket_messages(created_at);
create index quick_responses_category_id_idx on quick_responses(category_id);
create index quick_responses_created_by_idx on quick_responses(created_by);

-- Create updated_at trigger function
create or replace function update_updated_at_column()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

-- Add updated_at triggers
create trigger update_tickets_updated_at
    before update on tickets
    for each row
    execute function update_updated_at_column();

create trigger update_internal_notes_updated_at
    before update on internal_notes
    for each row
    execute function update_updated_at_column();

create trigger update_quick_responses_updated_at
    before update on quick_responses
    for each row
    execute function update_updated_at_column();

-- Enable RLS on all tables
alter table tickets enable row level security;
alter table tags enable row level security;
alter table ticket_tags enable row level security;
alter table internal_notes enable row level security;
alter table ticket_messages enable row level security;
alter table response_categories enable row level security;
alter table quick_responses enable row level security;

-- Set up RLS policies

-- Tickets policies
create policy "Admins have full access to tickets"
    on tickets for all
    to authenticated
    using (auth.jwt() ->> 'role' = 'admin');

create policy "Agents can view all tickets"
    on tickets for select
    to authenticated
    using (auth.jwt() ->> 'role' = 'agent');

create policy "Agents can create and update tickets"
    on tickets for insert
    to authenticated
    with check (auth.jwt() ->> 'role' = 'agent');

create policy "Customers can view their own tickets"
    on tickets for select
    to authenticated
    using (auth.jwt() ->> 'role' = 'customer' and created_by = auth.uid());

create policy "Customers can create tickets"
    on tickets for insert
    to authenticated
    with check (auth.jwt() ->> 'role' = 'customer' and auth.uid() = created_by);

-- Tags policies
create policy "Tags are viewable by all authenticated users"
    on tags for select
    to authenticated
    using (true);

create policy "Tags are manageable by agents and admins"
    on tags for all
    to authenticated
    using (auth.jwt() ->> 'role' in ('agent', 'admin'));

-- Ticket tags policies
create policy "Ticket tags are viewable by all authenticated users"
    on ticket_tags for select
    to authenticated
    using (true);

create policy "Ticket tags are manageable by agents and admins"
    on ticket_tags for all
    to authenticated
    using (auth.jwt() ->> 'role' in ('agent', 'admin'));

-- Internal notes policies
create policy "Internal notes are viewable by agents and admins"
    on internal_notes for select
    to authenticated
    using (auth.jwt() ->> 'role' in ('agent', 'admin'));

create policy "Internal notes are manageable by agents and admins"
    on internal_notes for all
    to authenticated
    using (auth.jwt() ->> 'role' in ('agent', 'admin'));

-- Ticket messages policies
create policy "Ticket messages are viewable by authenticated users"
    on ticket_messages for select
    to authenticated
    using (true);

create policy "Ticket messages are insertable by authenticated users"
    on ticket_messages for insert
    to authenticated
    with check (true);

-- Response categories policies
create policy "Response categories are viewable by agents and admins"
    on response_categories for select
    to authenticated
    using (auth.jwt() ->> 'role' in ('agent', 'admin'));

create policy "Response categories are manageable by admins"
    on response_categories for all
    to authenticated
    using (auth.jwt() ->> 'role' = 'admin');

-- Quick responses policies
create policy "Quick responses are viewable by agents and admins"
    on quick_responses for select
    to authenticated
    using (auth.jwt() ->> 'role' in ('agent', 'admin'));

create policy "Quick responses are manageable by agents and admins"
    on quick_responses for all
    to authenticated
    using (auth.jwt() ->> 'role' in ('agent', 'admin'));
