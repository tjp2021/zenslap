create extension if not exists "uuid-ossp";

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

-- Add basic indexes
create index tickets_status_idx on tickets(status);
create index tickets_priority_idx on tickets(priority);
create index tickets_created_at_idx on tickets(created_at);
create index tickets_created_by_idx on tickets(created_by); 