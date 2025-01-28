-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop types first (with CASCADE to handle dependencies)
DROP TYPE IF EXISTS intervention_status CASCADE;
DROP TYPE IF EXISTS intervention_type CASCADE;
DROP TYPE IF EXISTS contact_type CASCADE;
DROP TYPE IF EXISTS metric_type CASCADE;
DROP TYPE IF EXISTS event_type CASCADE;
DROP TYPE IF EXISTS message_status CASCADE;

-- Create types (in correct order)
CREATE TYPE message_status AS ENUM ('pending', 'processing', 'completed', 'failed');
CREATE TYPE event_type AS ENUM ('crisis_detected', 'alert_triggered', 'notification_sent', 'emergency_contacted', 'intervention_started', 'intervention_completed');
CREATE TYPE metric_type AS ENUM ('crisis_detection_latency', 'alert_trigger_latency', 'notification_delivery_latency', 'system_uptime', 'alert_delivery_success_rate');
CREATE TYPE contact_type AS ENUM ('emergency_services', 'crisis_team', 'mental_health', 'support');
CREATE TYPE intervention_type AS ENUM ('crisis_response', 'emergency_services', 'team_intervention', 'external_referral', 'followup');
CREATE TYPE intervention_status AS ENUM ('active', 'completed', 'failed', 'referred');

-- Create base tables
CREATE TABLE message_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    content TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    priority INTEGER NOT NULL DEFAULT 0,
    status message_status NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    processed_at TIMESTAMPTZ,
    processing_latency INTEGER
);

CREATE TABLE audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_type event_type NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID NOT NULL,
    actor_id UUID REFERENCES auth.users(id),
    event_data JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    ip_address TEXT,
    user_agent TEXT
);

CREATE TABLE performance_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    metric_type metric_type NOT NULL,
    value FLOAT NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
    metadata JSONB DEFAULT '{}'
);

CREATE TABLE emergency_contacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    service_name TEXT NOT NULL,
    contact_type contact_type NOT NULL,
    priority INTEGER NOT NULL DEFAULT 0,
    contact_details JSONB NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE interventions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_id UUID REFERENCES tickets(id),
    intervention_type intervention_type NOT NULL,
    status intervention_status NOT NULL DEFAULT 'active',
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at TIMESTAMPTZ,
    response_time INTEGER,
    outcome_data JSONB,
    responder_id UUID REFERENCES auth.users(id)
);

-- Create indexes
CREATE INDEX idx_message_queue_status_priority ON message_queue(status, priority DESC, created_at ASC);
CREATE INDEX idx_audit_log_event_type ON audit_log(event_type, created_at DESC);
CREATE INDEX idx_audit_log_entity ON audit_log(entity_type, entity_id);
CREATE INDEX idx_performance_metrics_type ON performance_metrics(metric_type, timestamp DESC);
CREATE INDEX idx_interventions_ticket ON interventions(ticket_id, started_at DESC);
CREATE INDEX idx_interventions_status ON interventions(status, started_at DESC);

-- Create trigger function
CREATE FUNCTION update_emergency_contacts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger (after table exists)
CREATE TRIGGER update_emergency_contacts_updated_at
    BEFORE UPDATE ON emergency_contacts
    FOR EACH ROW
    EXECUTE FUNCTION update_emergency_contacts_updated_at();

-- Enable RLS
ALTER TABLE message_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE emergency_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE interventions ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Staff can view message queue" ON message_queue 
    FOR SELECT TO authenticated
    USING (EXISTS (
        SELECT 1 FROM users_secure us
        WHERE us.id = auth.uid()
        AND us.role IN ('admin', 'agent')
    ));

CREATE POLICY "Staff can view audit log" ON audit_log 
    FOR SELECT TO authenticated
    USING (EXISTS (
        SELECT 1 FROM users_secure us
        WHERE us.id = auth.uid()
        AND us.role IN ('admin', 'agent')
    ));

CREATE POLICY "Staff can view performance metrics" ON performance_metrics 
    FOR SELECT TO authenticated
    USING (EXISTS (
        SELECT 1 FROM users_secure us
        WHERE us.id = auth.uid()
        AND us.role IN ('admin', 'agent')
    ));

CREATE POLICY "Staff can manage emergency contacts" ON emergency_contacts 
    FOR ALL TO authenticated
    USING (EXISTS (
        SELECT 1 FROM users_secure us
        WHERE us.id = auth.uid()
        AND us.role IN ('admin', 'agent')
    ));

CREATE POLICY "Staff can manage interventions" ON interventions 
    FOR ALL TO authenticated
    USING (EXISTS (
        SELECT 1 FROM users_secure us
        WHERE us.id = auth.uid()
        AND us.role IN ('admin', 'agent')
    ));

-- Grant permissions
GRANT ALL ON message_queue TO authenticated;
GRANT ALL ON audit_log TO authenticated;
GRANT ALL ON performance_metrics TO authenticated;
GRANT ALL ON emergency_contacts TO authenticated;
GRANT ALL ON interventions TO authenticated;

-- Handle realtime publication safely
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime'
    ) THEN
        CREATE PUBLICATION supabase_realtime;
    END IF;
END $$;

ALTER PUBLICATION supabase_realtime ADD TABLE message_queue;
ALTER PUBLICATION supabase_realtime ADD TABLE interventions;
