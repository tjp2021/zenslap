-- Clean up existing objects
DROP TRIGGER IF EXISTS sync_users_secure_trigger ON auth.users CASCADE;
DROP FUNCTION IF EXISTS public.sync_users_secure() CASCADE;
DROP TABLE IF EXISTS public.users_secure CASCADE;
DROP FUNCTION IF EXISTS auth.jwt() CASCADE;

-- Step 1: Set up JWT claims function
CREATE OR REPLACE FUNCTION auth.jwt()
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
    raw_app_meta_data JSONB;
BEGIN
    SELECT raw_app_meta_data INTO raw_app_meta_data
    FROM auth.users
    WHERE id = auth.uid();

    IF raw_app_meta_data IS NOT NULL THEN
        RETURN jsonb_build_object(
            'role', raw_app_meta_data->>'role'
        );
    END IF;

    RETURN jsonb_build_object();
END;
$$;

-- Step 2: Create users_secure table
CREATE TABLE public.users_secure (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    role TEXT,
    display_name TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Step 3: Create sync function and trigger
CREATE OR REPLACE FUNCTION public.sync_users_secure()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        INSERT INTO public.users_secure (id, email, role, display_name, created_at, updated_at)
        VALUES (
            NEW.id,
            NEW.email,
            NEW.raw_app_meta_data->>'role',
            NEW.raw_app_meta_data->>'display_name',
            NEW.created_at,
            now()
        )
        ON CONFLICT (id) DO UPDATE
        SET 
            email = EXCLUDED.email,
            role = EXCLUDED.role,
            display_name = EXCLUDED.display_name,
            updated_at = now();
    ELSIF TG_OP = 'DELETE' THEN
        DELETE FROM public.users_secure WHERE id = OLD.id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER sync_users_secure_trigger
AFTER INSERT OR UPDATE OR DELETE ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.sync_users_secure();

-- Step 4: Set up RLS
ALTER TABLE public.users_secure ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read all users
CREATE POLICY "Users can view all users when authenticated"
    ON public.users_secure
    FOR SELECT
    TO authenticated
    USING (auth.uid() IS NOT NULL);

-- Step 5: Grant permissions
GRANT SELECT ON public.users_secure TO authenticated;
GRANT SELECT ON public.users_secure TO anon;

-- Step 6: Sync existing users
INSERT INTO public.users_secure (id, email, role, display_name, created_at, updated_at)
SELECT 
    id,
    email,
    raw_app_meta_data->>'role',
    raw_app_meta_data->>'display_name',
    created_at,
    now()
FROM auth.users
ON CONFLICT (id) DO UPDATE
SET 
    email = EXCLUDED.email,
    role = EXCLUDED.role,
    display_name = EXCLUDED.display_name,
    updated_at = now();
