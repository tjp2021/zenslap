-- Ensure raw_app_meta_data has required fields and valid values
CREATE OR REPLACE FUNCTION public.sanitize_user_metadata()
RETURNS trigger AS $$
BEGIN
  -- Ensure raw_app_meta_data is not null and is a valid jsonb
  IF NEW.raw_app_meta_data IS NULL THEN
    NEW.raw_app_meta_data := '{}'::jsonb;
  END IF;

  -- Ensure role exists and is valid
  IF NOT (NEW.raw_app_meta_data ? 'role') THEN
    -- Default to 'user' role if not specified
    NEW.raw_app_meta_data := NEW.raw_app_meta_data || '{"role": "user"}'::jsonb;
  END IF;

  -- Validate role is one of: 'admin', 'agent', 'user'
  IF NOT (NEW.raw_app_meta_data->>'role' = ANY(ARRAY['admin', 'agent', 'user'])) THEN
    NEW.raw_app_meta_data := NEW.raw_app_meta_data || '{"role": "user"}'::jsonb;
  END IF;

  -- Preserve provider information if it exists
  IF NEW.raw_app_meta_data ? 'provider' THEN
    NEW.raw_app_meta_data := jsonb_build_object(
      'role', NEW.raw_app_meta_data->>'role',
      'provider', NEW.raw_app_meta_data->>'provider',
      'providers', NEW.raw_app_meta_data->'providers'
    );
  ELSE
    NEW.raw_app_meta_data := jsonb_build_object(
      'role', NEW.raw_app_meta_data->>'role'
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to sanitize metadata on insert or update
DROP TRIGGER IF EXISTS sanitize_user_metadata_trigger ON auth.users;
CREATE TRIGGER sanitize_user_metadata_trigger
  BEFORE INSERT OR UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.sanitize_user_metadata();

-- Update existing rows to apply sanitization
UPDATE auth.users
SET raw_app_meta_data = raw_app_meta_data;

-- Add constraint to ensure raw_app_meta_data is valid jsonb
ALTER TABLE auth.users 
  DROP CONSTRAINT IF EXISTS valid_raw_app_meta_data;

ALTER TABLE auth.users                                                                          
  ADD CONSTRAINT valid_raw_app_meta_data                                                        
  CHECK (raw_app_meta_data IS NULL OR jsonb_typeof(raw_app_meta_data) = 'object'); 