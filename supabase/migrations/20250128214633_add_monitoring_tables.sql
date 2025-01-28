-- 1. Drop dependencies (ALWAYS use CASCADE)
DROP TABLE IF EXISTS message_queue CASCADE;
DROP TABLE IF EXISTS monitoring_audit_log CASCADE;

-- 2. Create/modify types
-- No types needed for this migration

-- 3. Create base tables
CREATE TABLE message_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type TEXT NOT NULL,
    initial_severity TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    data JSONB NOT NULL,
    source TEXT NOT NULL,
    context JSONB,
    user_id UUID REFERENCES auth.users(id),
    session_id TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    processed_at TIMESTAMPTZ,
    processing_metadata JSONB,
    error TEXT,
    retry_count INTEGER DEFAULT 0
);

CREATE TABLE monitoring_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type TEXT NOT NULL,
    severity TEXT NOT NULL,
    event_data JSONB NOT NULL,
    analysis_data JSONB,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Add constraints and foreign keys
ALTER TABLE message_queue
    ADD CONSTRAINT valid_status CHECK (status IN ('pending', 'processing', 'processed', 'error'));

-- 5. Create indexes
CREATE INDEX idx_message_queue_status ON message_queue(status) WHERE status = 'pending';
CREATE INDEX idx_message_queue_created_at ON message_queue(created_at);
CREATE INDEX idx_message_queue_user_id ON message_queue(user_id);
CREATE INDEX idx_monitoring_audit_event_type ON monitoring_audit_log(event_type);
CREATE INDEX idx_monitoring_audit_severity ON monitoring_audit_log(severity);
CREATE INDEX idx_monitoring_audit_created_at ON monitoring_audit_log(created_at);

-- 6. Set up RLS
ALTER TABLE message_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE monitoring_audit_log ENABLE ROW LEVEL SECURITY;

-- 7. Create policies
CREATE POLICY "Service role can do everything" ON message_queue
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Users can view own messages" ON message_queue
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Service role full access to audit log" ON monitoring_audit_log
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Staff can view audit log" ON monitoring_audit_log
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users_secure
            WHERE users_secure.id = auth.uid()
            AND users_secure.role = 'staff'
        )
    );

-- 8. Grant permissions
-- Using RLS instead of direct grants

-- 9. Handle realtime
ALTER PUBLICATION supabase_realtime ADD TABLE message_queue;

-- 10. Create triggers (if needed)
-- No triggers needed for this migration

-- Add table comments for documentation
COMMENT ON TABLE message_queue IS 'Queue for monitoring events';
COMMENT ON TABLE monitoring_audit_log IS 'Audit log for monitoring events'; 