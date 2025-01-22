-- Update sync function to match standardized metadata
CREATE OR REPLACE FUNCTION public.sync_users_secure()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        INSERT INTO public.users_secure (id, email, role, created_at, updated_at)
        VALUES (
            NEW.id,
            NEW.email,
            COALESCE(NEW.raw_app_meta_data->>'role', 'user'),
            NEW.created_at,
            now()
        )
        ON CONFLICT (id) DO UPDATE
        SET 
            email = EXCLUDED.email,
            role = EXCLUDED.role,
            updated_at = now();
    ELSIF TG_OP = 'DELETE' THEN
        DELETE FROM public.users_secure WHERE id = OLD.id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Remove display_name column from users_secure
ALTER TABLE public.users_secure DROP COLUMN IF EXISTS display_name; 