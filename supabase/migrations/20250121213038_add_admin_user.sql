-- Enable pgcrypto extension
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create admin user
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'admin@example.com',
  crypt('password123', gen_salt('bf')),
  now(),
  jsonb_build_object('role', 'admin'),
  now(),
  now(),
  '',
  '',
  '',
  ''
);

-- Create trigger to set default role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- Set default role to 'user' if not specified
  IF NEW.raw_app_meta_data->>'role' IS NULL THEN
    NEW.raw_app_meta_data = 
      COALESCE(NEW.raw_app_meta_data, '{}'::jsonb) || 
      jsonb_build_object('role', 'user');
  END IF;
  
  RETURN NEW;
END;
$$ language plpgsql security definer;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger
CREATE TRIGGER on_auth_user_created
  BEFORE INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user(); 