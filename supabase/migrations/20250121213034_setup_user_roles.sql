-- First, set up the role for existing users (including your admin user)
UPDATE auth.users
SET raw_app_meta_data = jsonb_set(
  COALESCE(raw_app_meta_data, '{}'::jsonb),
  '{role}',
  '"admin"'::jsonb
)
WHERE email = 'tim@azothlabs.io';

-- Create function to handle new user creation
CREATE OR REPLACE FUNCTION handle_new_user_role()
RETURNS TRIGGER AS $$
BEGIN
  -- Set default role as 'user' for new signups
  UPDATE auth.users
  SET raw_app_meta_data = jsonb_set(
    COALESCE(raw_app_meta_data, '{}'::jsonb),
    '{role}',
    '"user"'::jsonb
  )
  WHERE id = NEW.id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user_role();

-- Create function to sync role changes
CREATE OR REPLACE FUNCTION sync_user_role()
RETURNS TRIGGER AS $$
BEGIN
  IF (NEW.raw_app_meta_data->>'role') IS DISTINCT FROM (OLD.raw_app_meta_data->>'role') THEN
    -- Force token refresh by updating updated_at
    UPDATE auth.users
    SET updated_at = now()
    WHERE id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for role changes
DROP TRIGGER IF EXISTS on_role_update ON auth.users;
CREATE TRIGGER on_role_update
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION sync_user_role();

-- Create simple view with role-based access
DROP VIEW IF EXISTS users;
CREATE VIEW users AS
SELECT 
  id,
  email,
  raw_app_meta_data->>'role' as role
FROM auth.users
WHERE 
  auth.uid() = id -- Users can see themselves
  OR 
  (SELECT raw_app_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) IN ('admin', 'agent'); -- Admins/agents see all

-- Grant necessary permissions
GRANT SELECT ON users TO authenticated; 