-- Create AI configuration table
create table if not exists ai_config (
    id uuid default uuid_generate_v4() primary key,
    provider text not null check (provider in ('openai', 'anthropic', 'cohere')),
    model text not null,
    api_key text not null,
    options jsonb default '{}'::jsonb,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- Create AI analyses table
create table if not exists ai_analyses (
    id uuid default uuid_generate_v4() primary key,
    ticket_id uuid not null references tickets(id) on delete cascade,
    type text not null check (type in ('sentiment', 'priority_suggestion', 'category_detection', 'response_suggestion', 'urgency_detection')),
    result jsonb not null,
    confidence float check (confidence >= 0 and confidence <= 1),
    model_info jsonb not null,
    created_at timestamptz not null default now()
);

-- Create webhooks table
create table if not exists webhooks (
    id uuid default uuid_generate_v4() primary key,
    url text not null,
    events text[] not null,
    secret text not null,
    is_active boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- Create workflows table
create table if not exists workflows (
    id uuid default uuid_generate_v4() primary key,
    name text not null,
    description text,
    trigger jsonb not null,
    conditions jsonb[] not null default array[]::jsonb[],
    actions jsonb[] not null default array[]::jsonb[],
    is_active boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- Create analytics tables
create table if not exists analytics_events (
    id uuid default uuid_generate_v4() primary key,
    event_type text not null,
    user_id uuid references auth.users(id),
    metadata jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now()
);

create table if not exists analytics_page_views (
    id uuid default uuid_generate_v4() primary key,
    page text not null,
    user_id uuid references auth.users(id),
    metadata jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now()
);

create table if not exists analytics_ticket_actions (
    id uuid default uuid_generate_v4() primary key,
    ticket_id uuid references tickets(id) on delete cascade,
    action text not null,
    user_id uuid references auth.users(id),
    metadata jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now()
);

create table if not exists analytics_searches (
    id uuid default uuid_generate_v4() primary key,
    query text not null,
    user_id uuid references auth.users(id),
    metadata jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now()
);

create table if not exists analytics_filters (
    id uuid default uuid_generate_v4() primary key,
    filters jsonb not null,
    user_id uuid references auth.users(id),
    metadata jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now()
);

create table if not exists analytics_bulk_actions (
    id uuid default uuid_generate_v4() primary key,
    action text not null,
    ticket_ids uuid[] not null,
    user_id uuid references auth.users(id),
    metadata jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now()
);

create table if not exists analytics_workflow_triggers (
    id uuid default uuid_generate_v4() primary key,
    workflow_id uuid references workflows(id) on delete cascade,
    trigger_type text not null,
    metadata jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now()
);

-- Add updated_at triggers
create trigger update_ai_config_updated_at
    before update on ai_config
    for each row
    execute function update_updated_at_column();

create trigger update_webhooks_updated_at
    before update on webhooks
    for each row
    execute function update_updated_at_column();

create trigger update_workflows_updated_at
    before update on workflows
    for each row
    execute function update_updated_at_column();

-- Enable RLS on all tables
alter table ai_config enable row level security;
alter table ai_analyses enable row level security;
alter table webhooks enable row level security;
alter table workflows enable row level security;
alter table analytics_events enable row level security;
alter table analytics_page_views enable row level security;
alter table analytics_ticket_actions enable row level security;
alter table analytics_searches enable row level security;
alter table analytics_filters enable row level security;
alter table analytics_bulk_actions enable row level security;
alter table analytics_workflow_triggers enable row level security;

-- Set up RLS policies

-- AI config policies
create policy "AI config is viewable by agents and admins"
    on ai_config for select
    to authenticated
    using (auth.jwt() ->> 'role' in ('agent', 'admin'));

create policy "AI config is manageable by admins"
    on ai_config for all
    to authenticated
    using (auth.jwt() ->> 'role' = 'admin');

-- AI analyses policies
create policy "AI analyses are viewable by agents and admins"
    on ai_analyses for select
    to authenticated
    using (auth.jwt() ->> 'role' in ('agent', 'admin'));

create policy "AI analyses are insertable by agents and admins"
    on ai_analyses for insert
    to authenticated
    with check (auth.jwt() ->> 'role' in ('agent', 'admin'));

-- Webhooks policies
create policy "Webhooks are viewable by agents and admins"
    on webhooks for select
    to authenticated
    using (auth.jwt() ->> 'role' in ('agent', 'admin'));

create policy "Webhooks are manageable by admins"
    on webhooks for all
    to authenticated
    using (auth.jwt() ->> 'role' = 'admin');

-- Workflows policies
create policy "Workflows are viewable by agents and admins"
    on workflows for select
    to authenticated
    using (auth.jwt() ->> 'role' in ('agent', 'admin'));

create policy "Workflows are manageable by admins"
    on workflows for all
    to authenticated
    using (auth.jwt() ->> 'role' = 'admin');

-- Analytics policies
create policy "Analytics are viewable by admins"
    on analytics_events for select
    to authenticated
    using (auth.jwt() ->> 'role' = 'admin');

create policy "Analytics are insertable by authenticated users"
    on analytics_events for insert
    to authenticated
    with check (true);

-- Apply same policies to other analytics tables
create policy "Analytics are viewable by admins"
    on analytics_page_views for select
    to authenticated
    using (auth.jwt() ->> 'role' = 'admin');

create policy "Analytics are insertable by authenticated users"
    on analytics_page_views for insert
    to authenticated
    with check (true);

create policy "Analytics are viewable by admins"
    on analytics_ticket_actions for select
    to authenticated
    using (auth.jwt() ->> 'role' = 'admin');

create policy "Analytics are insertable by authenticated users"
    on analytics_ticket_actions for insert
    to authenticated
    with check (true);

create policy "Analytics are viewable by admins"
    on analytics_searches for select
    to authenticated
    using (auth.jwt() ->> 'role' = 'admin');

create policy "Analytics are insertable by authenticated users"
    on analytics_searches for insert
    to authenticated
    with check (true);

create policy "Analytics are viewable by admins"
    on analytics_filters for select
    to authenticated
    using (auth.jwt() ->> 'role' = 'admin');

create policy "Analytics are insertable by authenticated users"
    on analytics_filters for insert
    to authenticated
    with check (true);

create policy "Analytics are viewable by admins"
    on analytics_bulk_actions for select
    to authenticated
    using (auth.jwt() ->> 'role' = 'admin');

create policy "Analytics are insertable by authenticated users"
    on analytics_bulk_actions for insert
    to authenticated
    with check (true);

create policy "Analytics are viewable by admins"
    on analytics_workflow_triggers for select
    to authenticated
    using (auth.jwt() ->> 'role' = 'admin');

create policy "Analytics are insertable by authenticated users"
    on analytics_workflow_triggers for insert
    to authenticated
    with check (true); 