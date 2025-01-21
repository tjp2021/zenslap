-- Create roles enum
create type user_role as enum ('admin', 'agent', 'customer');

-- Add role to auth.users via realtime replication
do $$ 
begin
    if not exists (select 1 from information_schema.columns where table_schema = 'auth' and table_name = 'users' and column_name = 'role') then
        alter table auth.users add column role user_role not null default 'customer';
    end if;
end $$;

-- Create role-based policies for tickets

-- Admin policies (full access)
create policy "Admins have full access to tickets"
    on tickets for all
    to authenticated
    using (auth.jwt() ->> 'role' = 'admin');

-- Agent policies
create policy "Agents can view all tickets"
    on tickets for select
    to authenticated
    using (auth.jwt() ->> 'role' = 'agent');

create policy "Agents can create tickets"
    on tickets for insert
    to authenticated
    with check (auth.jwt() ->> 'role' = 'agent');

create policy "Agents can update assigned tickets"
    on tickets for update
    to authenticated
    using (
        auth.jwt() ->> 'role' = 'agent' AND
        (metadata->>'assigned_to')::uuid = auth.uid()
    );

-- Customer policies
create policy "Customers can view their own tickets"
    on tickets for select
    to authenticated
    using (
        auth.jwt() ->> 'role' = 'customer' AND
        created_by = auth.uid()
    );

create policy "Customers can create tickets"
    on tickets for insert
    to authenticated
    with check (
        auth.jwt() ->> 'role' = 'customer' AND
        auth.uid() = created_by
    );

create policy "Customers can update their own tickets"
    on tickets for update
    to authenticated
    using (
        auth.jwt() ->> 'role' = 'customer' AND
        created_by = auth.uid()
    )
    with check (
        auth.jwt() ->> 'role' = 'customer' AND
        created_by = auth.uid() AND
        (
            title IS NOT NULL AND
            description IS NOT NULL AND
            status = 'new' AND
            priority = 'low' AND
            metadata = '{}'::jsonb
        )
    );

-- Internal notes policies
create policy "Only admins and agents can access internal notes"
    on internal_notes for all
    to authenticated
    using (auth.jwt() ->> 'role' in ('admin', 'agent'));

-- Messages policies
create policy "Admins and agents can view all messages"
    on ticket_messages for select
    to authenticated
    using (auth.jwt() ->> 'role' in ('admin', 'agent'));

create policy "Customers can view their own messages"
    on ticket_messages for select
    to authenticated
    using (
        auth.jwt() ->> 'role' = 'customer' AND
        ticket_id in (
            select id from tickets
            where created_by = auth.uid()
        )
    );

create policy "Admins and agents can create messages"
    on ticket_messages for insert
    to authenticated
    with check (auth.jwt() ->> 'role' in ('admin', 'agent'));

create policy "Customers can create messages on their own tickets"
    on ticket_messages for insert
    to authenticated
    with check (
        auth.jwt() ->> 'role' = 'customer' AND
        ticket_id in (
            select id from tickets
            where created_by = auth.uid()
        )
    );

create policy "Admins and agents can update messages"
    on ticket_messages for update
    to authenticated
    using (auth.jwt() ->> 'role' in ('admin', 'agent'));

create policy "Customers can update their own messages"
    on ticket_messages for update
    to authenticated
    using (
        auth.jwt() ->> 'role' = 'customer' AND
        created_by = auth.uid()::uuid
    );

create policy "Admins and agents can delete messages"
    on ticket_messages for delete
    to authenticated
    using (auth.jwt() ->> 'role' in ('admin', 'agent'));

create policy "Customers can delete their own messages"
    on ticket_messages for delete
    to authenticated
    using (
        auth.jwt() ->> 'role' = 'customer' AND
        created_by = auth.uid()::uuid
    );

-- Function to manage user roles
create or replace function manage_user_role(
    user_id uuid,
    new_role user_role
)
returns void
language plpgsql
security definer
as $$
begin
    if (select auth.jwt() ->> 'role') != 'admin' then
        raise exception 'Only admins can manage user roles';
    end if;
    
    update auth.users
    set role = new_role
    where id = user_id;
end;
$$; 