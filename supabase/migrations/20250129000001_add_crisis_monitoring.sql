-- migrate:up

begin;

-- Drop any existing objects first (in case of failed previous attempts)
drop type if exists public.contact_type cascade;
drop type if exists public.event_type cascade;
drop type if exists public.intervention_status cascade;
drop type if exists public.intervention_type cascade;
drop type if exists public.message_status cascade;
drop type if exists public.metric_type cascade;

-- Create ENUMs
create type public.contact_type as enum (
    'emergency_services',
    'crisis_team',
    'mental_health',
    'support'
);

create type public.event_type as enum (
    'crisis_detected',
    'alert_triggered',
    'notification_sent',
    'emergency_contacted',
    'intervention_started',
    'intervention_completed'
);

create type public.intervention_status as enum (
    'active',
    'completed',
    'failed',
    'referred'
);

create type public.intervention_type as enum (
    'crisis_response',
    'emergency_services',
    'team_intervention',
    'external_referral',
    'followup'
);

create type public.message_status as enum (
    'pending',
    'processing',
    'completed',
    'failed'
);

create type public.metric_type as enum (
    'crisis_detection_latency',
    'alert_trigger_latency',
    'notification_delivery_latency',
    'system_uptime',
    'alert_delivery_success_rate'
);

-- Create tables with proper schema references
create table public.audit_log (
    id uuid not null default gen_random_uuid(),
    event_type public.event_type not null,
    entity_type text not null,
    entity_id uuid not null,
    actor_id uuid references auth.users(id),
    event_data jsonb not null,
    created_at timestamptz not null default now(),
    ip_address text,
    user_agent text,
    constraint audit_log_pkey primary key (id)
);

create table public.emergency_contacts (
    id uuid not null default gen_random_uuid(),
    service_name text not null,
    contact_type public.contact_type not null,
    priority integer not null default 0,
    contact_details jsonb not null,
    is_active boolean default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint emergency_contacts_pkey primary key (id)
);

create table public.interventions (
    id uuid not null default gen_random_uuid(),
    ticket_id uuid references public.tickets(id),
    intervention_type public.intervention_type not null,
    status public.intervention_status not null default 'active',
    started_at timestamptz not null default now(),
    completed_at timestamptz,
    response_time integer,
    outcome_data jsonb,
    responder_id uuid references auth.users(id),
    constraint interventions_pkey primary key (id)
);

create table public.performance_metrics (
    id uuid not null default gen_random_uuid(),
    metric_type public.metric_type not null,
    value double precision not null,
    timestamp timestamptz not null default now(),
    metadata jsonb default '{}',
    constraint performance_metrics_pkey primary key (id)
);

-- Create indexes with explicit schema references
create index idx_audit_log_entity on public.audit_log using btree (entity_type, entity_id);
create index idx_audit_log_event_type on public.audit_log using btree (event_type, created_at desc);
create index idx_interventions_status on public.interventions using btree (status, started_at desc);
create index idx_interventions_ticket on public.interventions using btree (ticket_id, started_at desc);
create index idx_performance_metrics_type on public.performance_metrics using btree (metric_type, timestamp desc);

-- Enable RLS
alter table public.audit_log enable row level security;
alter table public.emergency_contacts enable row level security;
alter table public.interventions enable row level security;
alter table public.performance_metrics enable row level security;

-- Create RLS policies with explicit schema references
create policy "Staff can view audit log"
    on public.audit_log
    as permissive
    for select
    to authenticated
    using (
        exists (
            select 1
            from public.users_secure us
            where us.id = auth.uid()
            and us.role = any(array['admin', 'agent'])
        )
    );

create policy "Staff can manage emergency contacts"
    on public.emergency_contacts
    as permissive
    for all
    to authenticated
    using (
        exists (
            select 1
            from public.users_secure us
            where us.id = auth.uid()
            and us.role = any(array['admin', 'agent'])
        )
    );

create policy "Staff can manage interventions"
    on public.interventions
    as permissive
    for all
    to authenticated
    using (
        exists (
            select 1
            from public.users_secure us
            where us.id = auth.uid()
            and us.role = any(array['admin', 'agent'])
        )
    );

create policy "Staff can view performance metrics"
    on public.performance_metrics
    as permissive
    for select
    to authenticated
    using (
        exists (
            select 1
            from public.users_secure us
            where us.id = auth.uid()
            and us.role = any(array['admin', 'agent'])
        )
    );

-- Create trigger function for emergency_contacts
create or replace function public.update_emergency_contacts_updated_at()
    returns trigger
    language plpgsql
    security definer
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

create trigger update_emergency_contacts_updated_at
    before update on public.emergency_contacts
    for each row
    execute function public.update_emergency_contacts_updated_at();

-- Add tables to realtime publication
do $$
declare
    table_name text;
    tables text[] := array['public.interventions', 'public.emergency_contacts'];
begin
    if exists (
        select 1 from pg_publication where pubname = 'supabase_realtime'
    ) then
        foreach table_name in array tables loop
            if not exists (
                select 1 from pg_publication_tables 
                where pubname = 'supabase_realtime' 
                and schemaname || '.' || tablename = table_name
            ) then
                execute format('alter publication supabase_realtime add table %s', table_name);
            end if;
        end loop;
    end if;
end $$;

commit;

-- migrate:down

begin;

-- Remove tables from realtime publication if they exist
do $$
declare
    table_name text;
    tables text[] := array['public.interventions', 'public.emergency_contacts'];
begin
    if exists (
        select 1 from pg_publication where pubname = 'supabase_realtime'
    ) then
        foreach table_name in array tables loop
            if exists (
                select 1 from pg_publication_tables 
                where pubname = 'supabase_realtime' 
                and schemaname || '.' || tablename = table_name
            ) then
                execute format('alter publication supabase_realtime drop table %s', table_name);
            end if;
        end loop;
    end if;
end $$;

-- Drop trigger and function
drop trigger if exists update_emergency_contacts_updated_at on public.emergency_contacts;
drop function if exists public.update_emergency_contacts_updated_at();

-- Drop RLS policies
drop policy if exists "Staff can view audit log" on public.audit_log;
drop policy if exists "Staff can manage emergency contacts" on public.emergency_contacts;
drop policy if exists "Staff can manage interventions" on public.interventions;
drop policy if exists "Staff can view performance metrics" on public.performance_metrics;

-- Drop tables
drop table if exists public.performance_metrics cascade;
drop table if exists public.interventions cascade;
drop table if exists public.emergency_contacts cascade;
drop table if exists public.audit_log cascade;

-- Drop types
drop type if exists public.metric_type cascade;
drop type if exists public.message_status cascade;
drop type if exists public.intervention_type cascade;
drop type if exists public.intervention_status cascade;
drop type if exists public.event_type cascade;
drop type if exists public.contact_type cascade;

commit; 