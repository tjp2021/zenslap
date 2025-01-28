-- No initial data needed 

-- Insert admin user
INSERT INTO auth.users (id, email, created_at, updated_at)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'admin@example.com',
  now(),
  now()
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.profiles (id, email, role)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'admin@example.com',
  'ADMIN'
) ON CONFLICT (id) DO UPDATE SET role = 'ADMIN';

INSERT INTO public.users_secure (id, email, role, created_at, updated_at)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'admin@example.com',
  'ADMIN',
  now(),
  now()
) ON CONFLICT (id) DO UPDATE SET role = 'ADMIN';

-- Insert agent user
INSERT INTO auth.users (id, email, created_at, updated_at)
VALUES (
  '00000000-0000-0000-0000-000000000002',
  'agent@example.com',
  now(),
  now()
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.profiles (id, email, role)
VALUES (
  '00000000-0000-0000-0000-000000000002',
  'agent@example.com',
  'AGENT'
) ON CONFLICT (id) DO UPDATE SET role = 'AGENT';

INSERT INTO public.users_secure (id, email, role, created_at, updated_at)
VALUES (
  '00000000-0000-0000-0000-000000000002',
  'agent@example.com',
  'AGENT',
  now(),
  now()
) ON CONFLICT (id) DO UPDATE SET role = 'AGENT';

-- Add test tickets
INSERT INTO public.tickets (id, title, description, status, priority, created_by, assignee)
VALUES 
  ('11111111-1111-1111-1111-111111111111', 'Test Ticket 1', 'Description 1', 'open', 'medium', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002'),
  ('22222222-2222-2222-2222-222222222222', 'Test Ticket 2', 'Description 2', 'in_progress', 'high', '00000000-0000-0000-0000-000000000002', NULL);

-- Add test ticket activities
INSERT INTO public.ticket_activities (id, ticket_id, actor_id, activity_type, content, mentioned_user_ids)
VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000001', 'comment', '{"text": "Test comment", "is_internal": false, "mentions": []}'::jsonb, '{}'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000002', 'status_change', '{"from": "open", "to": "in_progress"}'::jsonb, '{}'); 