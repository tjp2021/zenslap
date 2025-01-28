-- 1. Drop dependencies with CASCADE
DROP TYPE IF EXISTS alert_status CASCADE;
DROP TYPE IF EXISTS alert_notification_status CASCADE;
DROP TABLE IF EXISTS critical_alert_notifications CASCADE;
DROP TABLE IF EXISTS critical_alerts CASCADE;

-- 2. Create types
CREATE TYPE alert_status AS ENUM ('pending', 'acknowledged', 'resolved');
CREATE TYPE alert_notification_status AS ENUM ('unread', 'read', 'acknowledged');

-- 3. Create base tables
CREATE TABLE critical_alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id UUID NOT NULL REFERENCES tickets(id),
  severity TEXT NOT NULL CHECK (severity IN ('critical', 'high', 'medium', 'low')),
  requires_immediate BOOLEAN NOT NULL DEFAULT false,
  crisis_type TEXT CHECK (crisis_type IN ('suicide_risk', 'self_harm', 'panic_attack', 'medical_emergency', 'severe_distress', 'emotional_distress', 'cultural_distress', 'general_stress', 'mental_health')),
  response_protocol TEXT CHECK (response_protocol IN ('immediate_intervention', 'emergency_services', 'rapid_response', 'urgent_intervention', 'standard_response')),
  confidence FLOAT NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  metadata JSONB,
  status alert_status NOT NULL DEFAULT 'pending',
  acknowledged_by UUID REFERENCES users_secure(id),
  acknowledged_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES users_secure(id),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE critical_alert_notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  alert_id UUID NOT NULL REFERENCES critical_alerts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users_secure(id),
  status alert_notification_status NOT NULL DEFAULT 'unread',
  read_at TIMESTAMPTZ,
  acknowledged_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Create indexes
CREATE INDEX idx_critical_alerts_ticket_id ON critical_alerts(ticket_id);
CREATE INDEX idx_critical_alerts_status ON critical_alerts(status);
CREATE INDEX idx_critical_alerts_severity ON critical_alerts(severity);
CREATE INDEX idx_critical_alerts_created_at ON critical_alerts(created_at);

CREATE INDEX idx_critical_alert_notifications_alert_id ON critical_alert_notifications(alert_id);
CREATE INDEX idx_critical_alert_notifications_user_id ON critical_alert_notifications(user_id);
CREATE INDEX idx_critical_alert_notifications_status ON critical_alert_notifications(status);
CREATE INDEX idx_critical_alert_notifications_created_at ON critical_alert_notifications(created_at);

-- 5. Create triggers for updated_at
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_critical_alerts_updated_at
  BEFORE UPDATE ON critical_alerts
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_critical_alert_notifications_updated_at
  BEFORE UPDATE ON critical_alert_notifications
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- 6. Enable RLS
ALTER TABLE critical_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE critical_alert_notifications ENABLE ROW LEVEL SECURITY;

-- 7. Create RLS policies
-- Critical Alerts policies
CREATE POLICY "Admins and agents can view all critical alerts"
  ON critical_alerts
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT id FROM users_secure 
      WHERE role IN ('admin', 'agent')
    )
  );

CREATE POLICY "System can create critical alerts"
  ON critical_alerts
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Admins and agents can update critical alerts"
  ON critical_alerts
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT id FROM users_secure 
      WHERE role IN ('admin', 'agent')
    )
  );

-- Critical Alert Notifications policies
CREATE POLICY "Users can view their own notifications"
  ON critical_alert_notifications
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "System can create notifications"
  ON critical_alert_notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update their own notifications"
  ON critical_alert_notifications
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

-- 8. Grant permissions
GRANT SELECT, INSERT, UPDATE ON critical_alerts TO authenticated;
GRANT SELECT, INSERT, UPDATE ON critical_alert_notifications TO authenticated;

-- 9. Add to realtime publication
DO $$ 
BEGIN
  -- Remove tables if they're in any publication
  IF EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE tablename = 'critical_alerts'
  ) THEN
    ALTER PUBLICATION supabase_realtime DROP TABLE critical_alerts;
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE tablename = 'critical_alert_notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime DROP TABLE critical_alert_notifications;
  END IF;

  -- Add tables to publication
  ALTER PUBLICATION supabase_realtime ADD TABLE critical_alerts;
  ALTER PUBLICATION supabase_realtime ADD TABLE critical_alert_notifications;
END $$;

-- 10. Verify publication setup
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename IN ('critical_alerts', 'critical_alert_notifications')
  ) THEN
    RAISE EXCEPTION 'Publication setup failed for critical alerts tables';
  END IF;
END $$; 