create table if not exists ticket_history (
    id uuid default uuid_generate_v4() primary key,
    ticket_id uuid not null references tickets(id) on delete cascade,
    field text not null,
    old_value text,
    new_value text,
    created_at timestamptz not null default now(),
    created_by text -- for future auth integration
);

-- Add indexes for common queries
create index ticket_history_ticket_id_idx on ticket_history(ticket_id);
create index ticket_history_created_at_idx on ticket_history(created_at);

-- Create a function to record changes
create or replace function record_ticket_change()
returns trigger as $$
begin
    if TG_OP = 'UPDATE' then
        -- Record changes for each field
        if OLD.title != NEW.title then
            insert into ticket_history (ticket_id, field, old_value, new_value)
            values (NEW.id, 'title', OLD.title, NEW.title);
        end if;

        if OLD.description != NEW.description then
            insert into ticket_history (ticket_id, field, old_value, new_value)
            values (NEW.id, 'description', OLD.description, NEW.description);
        end if;

        if OLD.status != NEW.status then
            insert into ticket_history (ticket_id, field, old_value, new_value)
            values (NEW.id, 'status', OLD.status, NEW.status);
        end if;

        if OLD.priority != NEW.priority then
            insert into ticket_history (ticket_id, field, old_value, new_value)
            values (NEW.id, 'priority', OLD.priority, NEW.priority);
        end if;
    end if;
    return NEW;
end;
$$ language plpgsql;

-- Create trigger to record changes
create trigger ticket_history_trigger
after update on tickets
for each row
execute function record_ticket_change(); 