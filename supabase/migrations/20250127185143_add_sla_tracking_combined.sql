-- Migration: 20250127185143_add_sla_tracking_combined.sql
-- Description: Add SLA tracking functionality with proper type safety
-- Following migration guidelines for clean, idempotent, and properly ordered operations

-- Step 1: Create types (idempotent)
DO $$ BEGIN
    CREATE TYPE public.sla_priority AS ENUM ('low', 'medium', 'high');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.sla_status AS ENUM ('pending', 'breached', 'met');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Step 2: Create tables (idempotent)
CREATE TABLE IF NOT EXISTS public.sla_policies (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    priority sla_priority NOT NULL,
    response_time_hours integer NOT NULL,
    resolution_time_hours integer NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT sla_policies_pkey PRIMARY KEY (id),
    CONSTRAINT sla_policies_response_time_check CHECK (response_time_hours > 0),
    CONSTRAINT sla_policies_resolution_time_check CHECK (resolution_time_hours > 0)
);

-- Step 3: Create indexes (idempotent)
DO $$ BEGIN
    CREATE UNIQUE INDEX unique_active_priority ON public.sla_policies (priority) WHERE is_active = true;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Step 4: Add columns (idempotent)
DO $$ BEGIN
    ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS new_priority sla_priority;
    ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS sla_response_deadline timestamp with time zone;
    ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS sla_resolution_deadline timestamp with time zone;
    ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS first_response_at timestamp with time zone;
    ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS resolution_at timestamp with time zone;
    ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS sla_response_status sla_status DEFAULT 'pending';
    ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS sla_resolution_status sla_status DEFAULT 'pending';
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

-- Step 5: Data migration (idempotent)
DO $$ BEGIN
    UPDATE public.tickets 
    SET new_priority = 
        CASE priority
            WHEN 'low' THEN 'low'::sla_priority
            WHEN 'medium' THEN 'medium'::sla_priority
            WHEN 'high' THEN 'high'::sla_priority
            ELSE 'low'::sla_priority
        END
    WHERE new_priority IS NULL;
EXCEPTION
    WHEN undefined_column THEN null;
END $$;

-- Step 6: Drop old column and rename new (idempotent)
DO $$ BEGIN
    ALTER TABLE public.tickets DROP COLUMN IF EXISTS priority;
    ALTER TABLE public.tickets RENAME COLUMN new_priority TO priority;
EXCEPTION
    WHEN undefined_column THEN null;
    WHEN duplicate_column THEN null;
END $$;

-- Step 7: Set column constraints (idempotent)
DO $$ BEGIN
    ALTER TABLE public.tickets ALTER COLUMN priority SET NOT NULL;
    ALTER TABLE public.tickets ALTER COLUMN priority SET DEFAULT 'low'::sla_priority;
EXCEPTION
    WHEN undefined_column THEN null;
END $$;

-- Step 8: Create functions (always replace)
CREATE OR REPLACE FUNCTION public.update_sla_status()
RETURNS TRIGGER AS $$
BEGIN
    -- Update first response timestamp if it's a comment and not set yet
    IF NEW.activity_type = 'comment' AND OLD.first_response_at IS NULL THEN
        NEW.first_response_at = now();
        -- Update SLA response status
        IF NEW.first_response_at <= NEW.sla_response_deadline THEN
            NEW.sla_response_status = 'met';
        ELSE
            NEW.sla_response_status = 'breached';
        END IF;
    END IF;

    -- Update resolution timestamp if status changed to 'resolved'
    IF NEW.status = 'resolved' AND OLD.status != 'resolved' THEN
        NEW.resolution_at = now();
        -- Update SLA resolution status
        IF NEW.resolution_at <= NEW.sla_resolution_deadline THEN
            NEW.sla_resolution_status = 'met';
        ELSE
            NEW.sla_resolution_status = 'breached';
        END IF;
    -- Reset resolution timestamp if status changed from 'resolved' to something else
    ELSIF NEW.status != 'resolved' AND OLD.status = 'resolved' THEN
        NEW.resolution_at = NULL;
        NEW.sla_resolution_status = 'pending';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 9: Create triggers (idempotent)
DO $$ BEGIN
    CREATE TRIGGER update_ticket_sla_status
        BEFORE UPDATE ON public.tickets
        FOR EACH ROW
        EXECUTE FUNCTION public.update_sla_status();
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Step 10: Create views (always replace)
CREATE OR REPLACE VIEW public.sla_monitoring AS
SELECT 
    t.id,
    t.title,
    t.status,
    t.priority,
    t.created_at,
    t.sla_response_deadline,
    t.sla_resolution_deadline,
    t.first_response_at,
    t.resolution_at,
    t.sla_response_status,
    t.sla_resolution_status,
    CASE 
        WHEN t.first_response_at IS NULL AND now() > t.sla_response_deadline THEN true
        WHEN t.resolution_at IS NULL AND now() > t.sla_resolution_deadline THEN true
        ELSE false
    END as is_breaching_sla
FROM public.tickets t;

-- Step 11: Enable RLS and create policies (idempotent)
ALTER TABLE public.sla_policies ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    CREATE POLICY "admin_all" ON public.sla_policies
        FOR ALL
        TO authenticated
        USING (EXISTS (
            SELECT 1 FROM users_secure us
            WHERE us.id = auth.uid() AND us.role = 'admin'
        ))
        WITH CHECK (EXISTS (
            SELECT 1 FROM users_secure us
            WHERE us.id = auth.uid() AND us.role = 'admin'
        ));
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE POLICY "view_active" ON public.sla_policies
        FOR SELECT
        TO authenticated
        USING (is_active = true);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Step 12: Grant privileges
GRANT SELECT ON public.sla_policies TO authenticated;
GRANT SELECT ON public.sla_monitoring TO authenticated;

-- Step 13: Insert default data (idempotent)
INSERT INTO public.sla_policies (priority, response_time_hours, resolution_time_hours)
SELECT priority, response_time_hours, resolution_time_hours
FROM (VALUES 
    ('low'::sla_priority, 24, 72),
    ('medium'::sla_priority, 8, 24),
    ('high'::sla_priority, 1, 4)
) AS v(priority, response_time_hours, resolution_time_hours)
WHERE NOT EXISTS (
    SELECT 1 FROM public.sla_policies
);

-- Step 14: Create updated_at trigger (idempotent)
DO $$ BEGIN
    CREATE TRIGGER update_sla_policies_updated_at
        BEFORE UPDATE ON public.sla_policies
        FOR EACH ROW
        EXECUTE FUNCTION public.update_updated_at();
EXCEPTION
    WHEN duplicate_object THEN null;
END $$; 