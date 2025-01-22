-- Drop everything and start fresh
DROP VIEW IF EXISTS users;
DROP TRIGGER IF EXISTS on_role_update ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS sync_user_role();
DROP FUNCTION IF EXISTS handle_new_user_role();

-- Grant supabase_admin all privileges
GRANT ALL ON auth.users TO postgres;
ALTER DEFAULT PRIVILEGES IN SCHEMA auth GRANT ALL ON TABLES TO postgres;

-- Force set role with postgres privileges
SET ROLE postgres;

-- Explicitly set your role and verify
DO $$
BEGIN
    -- Set role for specific user
    UPDATE auth.users
    SET raw_app_meta_data = jsonb_build_object('role', 'admin')
    WHERE email = 'tim@azothlabs.io';

    -- Log the result
    RAISE NOTICE 'Updated user role: %', (
        SELECT raw_app_meta_data 
        FROM auth.users 
        WHERE email = 'tim@azothlabs.io'
    );
END $$;

-- Create minimal view with no RLS
CREATE VIEW users AS
SELECT 
    id,
    email,
    raw_app_meta_data->>'role' as role
FROM auth.users;

-- Grant access
GRANT ALL ON users TO authenticated;
GRANT ALL ON users TO anon;
GRANT ALL ON auth.users TO authenticated; 