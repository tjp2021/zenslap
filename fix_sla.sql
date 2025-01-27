-- Drop everything first
DROP TABLE IF EXISTS public.sla_policies CASCADE;
DROP TYPE IF EXISTS public.sla_priority CASCADE;

-- Create enum
CREATE TYPE public.sla_priority AS ENUM ('high', 'medium', 'low');

-- Create table
CREATE TABLE public.sla_policies (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    priority sla_priority NOT NULL,
    response_time_hours INTEGER NOT NULL CHECK (response_time_hours > 0),
    resolution_time_hours INTEGER NOT NULL CHECK (resolution_time_hours > 0),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add index
CREATE UNIQUE INDEX unique_active_priority ON public.sla_policies (priority) WHERE is_active = true;

-- Enable RLS
ALTER TABLE public.sla_policies ENABLE ROW LEVEL SECURITY;

-- Add policies
CREATE POLICY admin_all ON public.sla_policies FOR ALL TO authenticated USING (auth.jwt() ->> 'role' = 'ADMIN') WITH CHECK (auth.jwt() ->> 'role' = 'ADMIN');
CREATE POLICY view_active ON public.sla_policies FOR SELECT TO authenticated USING (is_active = true);

-- Add trigger
CREATE OR REPLACE FUNCTION public.update_sla_policies_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_sla_policies_updated_at
    BEFORE UPDATE ON public.sla_policies
    FOR EACH ROW
    EXECUTE FUNCTION public.update_sla_policies_updated_at();

-- Insert default policies
INSERT INTO public.sla_policies (priority, response_time_hours, resolution_time_hours)
SELECT 
    priority,
    CASE 
        WHEN priority = 'high' THEN 1
        WHEN priority = 'medium' THEN 4
        WHEN priority = 'low' THEN 8
    END as response_time_hours,
    CASE 
        WHEN priority = 'high' THEN 4
        WHEN priority = 'medium' THEN 24
        WHEN priority = 'low' THEN 48
    END as resolution_time_hours
FROM unnest(enum_range(NULL::sla_priority)) priority; 