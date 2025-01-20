create table tickets (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  description text not null,
  status text not null,
  priority text not null,
  metadata jsonb default '{}'::jsonb,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Add basic indexes
create index tickets_status_idx on tickets(status);
create index tickets_priority_idx on tickets(priority);
create index tickets_created_at_idx on tickets(created_at); 