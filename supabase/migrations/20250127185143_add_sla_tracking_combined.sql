-- Create SLA priority type
CREATE TYPE public.sla_priority AS ENUM ('low', 'medium', 'high');

-- Create SLA status type
CREATE TYPE public.sla_status AS ENUM ('pending', 'breached', 'met');

-- Add new priority column
ALTER TABLE public.tickets 
    ADD COLUMN new_priority sla_priority;

-- Update the new column based on the old one
UPDATE public.tickets 
SET new_priority = 
    CASE priority
        WHEN 'low' THEN 'low'::sla_priority
        WHEN 'medium' THEN 'medium'::sla_priority
        WHEN 'high' THEN 'high'::sla_priority
        ELSE 'low'::sla_priority
    END;

-- Drop the old column
ALTER TABLE public.tickets 
    DROP COLUMN priority;

-- Rename the new column
ALTER TABLE public.tickets 
    RENAME COLUMN new_priority TO priority;

-- Set the new column as not null with default
ALTER TABLE public.tickets 
    ALTER COLUMN priority SET NOT NULL,
    ALTER COLUMN priority SET DEFAULT 'low'::sla_priority;

-- Create SLA policies table
CREATE TABLE public.sla_policies (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    priority sla_priority NOT NULL,
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

-- Add SLA tracking columns to tickets table
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS sla_response_deadline timestamp with time zone;
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS sla_resolution_deadline timestamp with time zone;
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS first_response_at timestamp with time zone;
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS resolution_at timestamp with time zone;
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS sla_response_status sla_status DEFAULT 'pending';
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS sla_resolution_status sla_status DEFAULT 'pending';

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

-- Create trigger for SLA status updates
CREATE TRIGGER update_ticket_sla_status
    BEFORE UPDATE ON public.tickets
    FOR EACH ROW
    EXECUTE FUNCTION public.update_sla_status();

-- Create function to calculate SLA deadlines
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

-- Create trigger for SLA deadline calculations
CREATE TRIGGER set_ticket_sla_deadlines
    BEFORE INSERT ON public.tickets
    FOR EACH ROW
    EXECUTE FUNCTION public.calculate_sla_deadlines();

-- Create view for SLA monitoring
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

-- Enable RLS
ALTER TABLE public.sla_policies ENABLE ROW LEVEL SECURITY;

-- Create policies for SLA policies table
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

CREATE POLICY "view_active" ON public.sla_policies
    FOR SELECT
    TO authenticated
    USING (is_active = true);

-- Grant access to authenticated users
GRANT SELECT ON public.sla_policies TO authenticated;
GRANT SELECT ON public.sla_monitoring TO authenticated;

-- Insert default SLA policies
INSERT INTO public.sla_policies (priority, response_time_hours, resolution_time_hours)
VALUES 
    ('low', 24, 72),
    ('medium', 8, 24),
    ('high', 1, 4);

-- Create updated_at trigger for SLA policies
CREATE TRIGGER update_sla_policies_updated_at
    BEFORE UPDATE ON public.sla_policies
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at(); 