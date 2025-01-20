-- Enable RLS on all tables
alter table tickets enable row level security;
alter table ticket_activities enable row level security;

-- Fix actor_id type to match auth.uid()
alter table ticket_activities alter column actor_id type uuid using actor_id::uuid;

-- Create policies for tickets
create policy "Authenticated users can view all tickets"
    on tickets for select
    to authenticated
    using (true);

create policy "Authenticated users can create tickets"
    on tickets for insert
    to authenticated
    with check (true);

create policy "Authenticated users can update tickets"
    on tickets for update
    to authenticated
    using (true);

-- Create policies for ticket activities
create policy "Authenticated users can view all activities"
    on ticket_activities for select
    to authenticated
    using (true);

create policy "Authenticated users can create activities"
    on ticket_activities for insert
    to authenticated
    with check (auth.uid() = actor_id);

-- Note: We don't allow updating or deleting activities to maintain audit trail 