-- Drop dependent triggers first
DROP TRIGGER IF EXISTS set_ticket_sla_deadlines ON public.tickets;
DROP TRIGGER IF EXISTS update_ticket_sla_status ON public.tickets;

-- Drop functions
DROP FUNCTION IF EXISTS public.calculate_sla_deadlines;
DROP FUNCTION IF EXISTS public.update_sla_status;

-- Drop views that depend on the priority column
DROP VIEW IF EXISTS public.sla_monitoring;

-- Drop and recreate sla_policies table
DROP TABLE IF EXISTS public.sla_policies CASCADE;

CREATE TABLE public.sla_policies (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    priority text NOT NULL,
    response_time_hours integer NOT NULL CHECK (response_time_hours > 0),
    resolution_time_hours integer NOT NULL CHECK (resolution_time_hours > 0),
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Create unique index for active policies
CREATE UNIQUE INDEX unique_active_priority ON public.sla_policies (priority) WHERE is_active = true;

-- Add comment to SLA policies table
COMMENT ON TABLE public.sla_policies IS 'Stores SLA policy configurations for different ticket priorities';

-- Insert default SLA policies
INSERT INTO public.sla_policies (priority, response_time_hours, resolution_time_hours)
VALUES 
    ('low', 24, 72),
    ('medium', 8, 24),
    ('high', 1, 4);

-- Create new functions with text priority
CREATE OR REPLACE FUNCTION public.calculate_sla_deadlines()
RETURNS TRIGGER AS $$
DECLARE
    policy_record RECORD;
BEGIN
    -- Get the active SLA policy for the ticket's priority
    SELECT * INTO policy_record
    FROM public.sla_policies
    WHERE priority = NEW.priority AND is_active = true;

    IF FOUND THEN
        -- Calculate response deadline
        NEW.sla_response_deadline := NEW.created_at + (policy_record.response_time_hours || ' hours')::interval;
        -- Calculate resolution deadline
        NEW.sla_resolution_deadline := NEW.created_at + (policy_record.resolution_time_hours || ' hours')::interval;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to update SLA status
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

-- Recreate triggers
CREATE TRIGGER set_ticket_sla_deadlines
    BEFORE INSERT ON public.tickets
    FOR EACH ROW
    EXECUTE FUNCTION public.calculate_sla_deadlines();

CREATE TRIGGER update_ticket_sla_status
    BEFORE UPDATE ON public.tickets
    FOR EACH ROW
    EXECUTE FUNCTION public.update_sla_status();

-- Recreate view
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

-- Step 1: Drop all dependent views and functions first
DROP VIEW IF EXISTS "public"."sla_monitoring";
DROP VIEW IF EXISTS "public"."schema_columns";
DROP VIEW IF EXISTS "public"."schema_constraints";
DROP VIEW IF EXISTS "public"."columns";
DROP VIEW IF EXISTS "public"."table_constraints";

-- Step 2: Drop foreign key constraints that might reference tables with sla_priority
ALTER TABLE IF EXISTS "public"."sla_policies" DROP CONSTRAINT IF EXISTS "sla_policies_priority_fkey";

-- Step 3: Drop any check constraints using sla_priority
ALTER TABLE IF EXISTS "public"."tickets" DROP CONSTRAINT IF EXISTS "tickets_priority_check";
ALTER TABLE IF EXISTS "public"."sla_policies" DROP CONSTRAINT IF EXISTS "sla_policies_priority_check";

-- Step 4: Create a temporary column for the transition
ALTER TABLE IF EXISTS "public"."sla_policies" 
  ADD COLUMN IF NOT EXISTS priority_new text;

-- Step 5: Migrate the data
UPDATE "public"."sla_policies" 
SET priority_new = priority::text 
WHERE priority_new IS NULL;

-- Step 6: Drop the old column and rename the new one
ALTER TABLE IF EXISTS "public"."sla_policies" 
  DROP COLUMN IF EXISTS priority CASCADE;
ALTER TABLE IF EXISTS "public"."sla_policies" 
  RENAME COLUMN priority_new TO priority;

-- Step 7: Add new constraints with text type
ALTER TABLE IF EXISTS "public"."sla_policies"
  ADD CONSTRAINT "sla_policies_priority_check"
  CHECK (priority = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'urgent'::text]));

-- Step 8: Drop the enum type if it exists
DROP TYPE IF EXISTS "public"."sla_priority";

-- Down migration for safety
-- Note: This is a destructive change, down migration will preserve text type
-- but maintain data integrity
ALTER TABLE IF EXISTS "public"."sla_policies"
  DROP CONSTRAINT IF EXISTS "sla_policies_priority_check";
