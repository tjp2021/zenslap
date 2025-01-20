-- Create ticket activities table for tracking all ticket-related activities
create table ticket_activities (
    id uuid primary key default uuid_generate_v4(),
    ticket_id uuid not null references tickets(id) on delete cascade,
    actor_id text not null,
    activity_type text not null check (
        activity_type in ('comment', 'note', 'status_change', 'field_change')
    ),
    is_internal boolean default false,
    parent_id uuid references ticket_activities(id),
    content jsonb not null,
    created_at timestamptz not null default now()
);

-- Create index for efficient ticket activity retrieval
create index ticket_activities_ticket_id_created_at_idx 
    on ticket_activities(ticket_id, created_at desc);

-- Add comment for documentation
comment on table ticket_activities is 'Stores all ticket-related activities including comments, notes, and changes';
comment on column ticket_activities.activity_type is 'Type of activity: comment, note, status_change, or field_change';
comment on column ticket_activities.is_internal is 'Whether this activity is internal-only (e.g. internal notes)';
comment on column ticket_activities.content is 'JSONB content specific to activity type'; 