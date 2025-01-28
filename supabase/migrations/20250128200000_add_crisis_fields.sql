-- Create crisis type enum
CREATE TYPE public.crisis_type AS ENUM (
    'suicide_risk',
    'self_harm',
    'panic_attack', 
    'medical_emergency',
    'severe_distress',
    'emotional_distress',
    'cultural_distress',
    'general_stress',
    'mental_health'
);

-- Create severity type enum
CREATE TYPE public.severity_level AS ENUM (
    'critical',
    'high',
    'medium',
    'low'
);

-- Create response protocol enum
CREATE TYPE public.response_protocol AS ENUM (
    'immediate_intervention',
    'emergency_services',
    'rapid_response',
    'urgent_intervention',
    'standard_response'
);

-- Add crisis-related columns to tickets
ALTER TABLE public.tickets
ADD COLUMN IF NOT EXISTS crisis_type crisis_type,
ADD COLUMN IF NOT EXISTS severity_level severity_level,
ADD COLUMN IF NOT EXISTS response_protocol response_protocol,
ADD COLUMN IF NOT EXISTS requires_immediate boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS has_actionable_plan boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS is_passive_ideation boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS escalated_from uuid REFERENCES public.tickets(id),
ADD COLUMN IF NOT EXISTS location_based boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS cultural_context text,
ADD COLUMN IF NOT EXISTS is_metaphorical boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS is_general_inquiry boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS last_crisis_assessment_at timestamptz;

-- Create index for crisis-related queries
CREATE INDEX IF NOT EXISTS idx_tickets_crisis 
ON public.tickets(crisis_type, severity_level, requires_immediate);

CREATE INDEX IF NOT EXISTS idx_tickets_escalated_from 
ON public.tickets(escalated_from);

-- Add trigger to update last_crisis_assessment_at
CREATE OR REPLACE FUNCTION public.update_crisis_assessment_timestamp()
RETURNS trigger AS $$
BEGIN
    IF (
        NEW.crisis_type IS DISTINCT FROM OLD.crisis_type OR
        NEW.severity_level IS DISTINCT FROM OLD.severity_level OR
        NEW.response_protocol IS DISTINCT FROM OLD.response_protocol OR
        NEW.requires_immediate IS DISTINCT FROM OLD.requires_immediate OR
        NEW.has_actionable_plan IS DISTINCT FROM OLD.has_actionable_plan OR
        NEW.is_passive_ideation IS DISTINCT FROM OLD.is_passive_ideation
    ) THEN
        NEW.last_crisis_assessment_at = NOW();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_crisis_assessment_timestamp
    BEFORE UPDATE ON public.tickets
    FOR EACH ROW
    EXECUTE FUNCTION public.update_crisis_assessment_timestamp();

-- Add RLS policies for crisis fields
DO $$
BEGIN
    BEGIN
        DROP POLICY "Crisis fields viewable by staff only" ON public.tickets;
    EXCEPTION
        WHEN undefined_object THEN
            -- Do nothing, policy doesn't exist
    END;
END $$;

CREATE POLICY "Crisis fields viewable by staff only"
    ON public.tickets
    FOR SELECT
    TO authenticated
    USING (
        (
            -- Staff can see all crisis fields
            EXISTS (
                SELECT 1 FROM users_secure us
                WHERE us.id = auth.uid()
                AND us.role IN ('ADMIN', 'AGENT')
            )
        ) OR (
            -- Regular users see limited crisis info
            (assignee = auth.uid() OR created_by = auth.uid())
            AND severity_level NOT IN ('critical', 'high')
        )
    ); 