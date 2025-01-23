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