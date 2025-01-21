-- Create tags table
create table if not exists tags (
    id uuid default uuid_generate_v4() primary key,
    name text not null,
    color text,
    created_at timestamptz not null default now(),
    unique(name)
);

-- Create ticket_tags junction table for many-to-many relationship
create table if not exists ticket_tags (
    ticket_id uuid not null references tickets(id) on delete cascade,
    tag_id uuid not null references tags(id) on delete cascade,
    created_at timestamptz not null default now(),
    primary key (ticket_id, tag_id)
);

-- Create internal notes table
create table if not exists internal_notes (
    id uuid default uuid_generate_v4() primary key,
    ticket_id uuid not null references tickets(id) on delete cascade,
    content text not null,
    created_by uuid not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    -- Add indexes for common queries
    constraint fk_ticket foreign key (ticket_id) references tickets(id) on delete cascade
);

-- Create ticket messages table
create table if not exists ticket_messages (
    id uuid default uuid_generate_v4() primary key,
    ticket_id uuid not null references tickets(id) on delete cascade,
    content text not null,
    type text not null check (type in ('customer', 'agent')),
    created_by uuid not null,
    created_at timestamptz not null default now(),
    -- Add indexes for common queries
    constraint fk_ticket foreign key (ticket_id) references tickets(id) on delete cascade
);

-- Add indexes for performance
create index ticket_tags_ticket_id_idx on ticket_tags(ticket_id);
create index ticket_tags_tag_id_idx on ticket_tags(tag_id);
create index internal_notes_ticket_id_idx on internal_notes(ticket_id);
create index internal_notes_created_at_idx on internal_notes(created_at);
create index ticket_messages_ticket_id_idx on ticket_messages(ticket_id);
create index ticket_messages_created_at_idx on ticket_messages(created_at);

-- Add updated_at trigger for internal_notes
create or replace function update_updated_at_column()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

create trigger update_internal_notes_updated_at
    before update on internal_notes
    for each row
    execute function update_updated_at_column();

-- Add RLS policies
alter table tags enable row level security;
alter table ticket_tags enable row level security;
alter table internal_notes enable row level security;
alter table ticket_messages enable row level security;

-- Tags policies (only agents and admins can manage tags)
create policy "Tags are viewable by authenticated users"
    on tags for select
    to authenticated
    using (true);

create policy "Tags are insertable by agents and admins"
    on tags for insert
    to authenticated
    with check (auth.jwt() ->> 'role' in ('agent', 'admin'));

create policy "Tags are updatable by agents and admins"
    on tags for update
    to authenticated
    using (auth.jwt() ->> 'role' in ('agent', 'admin'));

-- Ticket tags policies
create policy "Ticket tags are viewable by authenticated users"
    on ticket_tags for select
    to authenticated
    using (true);

create policy "Ticket tags are manageable by agents and admins"
    on ticket_tags for all
    to authenticated
    using (auth.jwt() ->> 'role' in ('agent', 'admin'));

-- Internal notes policies (only visible to agents and admins)
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

-- Messages can only be updated by their creator or admins
create policy "Ticket messages are updatable by creator or admins"
    on ticket_messages for update
    to authenticated
    using (
        auth.uid() = created_by::uuid
        or auth.jwt() ->> 'role' = 'admin'
    ); 