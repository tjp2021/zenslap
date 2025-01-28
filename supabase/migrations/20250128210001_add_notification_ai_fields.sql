-- Step 1: Drop existing objects with CASCADE
DROP INDEX IF EXISTS idx_notifications_ai_analysis CASCADE;
DROP INDEX IF EXISTS idx_notifications_priority CASCADE;

-- Step 2: Create types (none needed, using existing ones)

-- Step 3: Create base table structure (add columns)
ALTER TABLE notifications 
    ADD COLUMN ai_analysis_id UUID,
    ADD COLUMN priority TEXT,
    ADD COLUMN confidence FLOAT,
    ADD COLUMN ai_metadata JSONB DEFAULT '{}'::jsonb;

-- Step 4: Add constraints
ALTER TABLE notifications 
    ADD CONSTRAINT notifications_ai_analysis_id_fkey 
        FOREIGN KEY (ai_analysis_id) REFERENCES ai_analyses(id),
    ADD CONSTRAINT notifications_priority_check 
        CHECK (priority IN ('high', 'medium', 'low')),
    ADD CONSTRAINT notifications_confidence_check 
        CHECK (confidence >= 0 AND confidence <= 1);

-- Step 5: Create indexes
CREATE INDEX idx_notifications_ai_analysis ON notifications(ai_analysis_id);
CREATE INDEX idx_notifications_priority ON notifications(priority);

-- Step 6: Set permissions
GRANT ALL ON notifications TO authenticated;
GRANT ALL ON notifications TO service_role;

-- Step 7: Enable RLS (already enabled)

-- Step 8: Create policies (using existing ones)

-- Step 9: Create trigger function (keeping existing one)

-- Step 10: Create trigger (keeping existing one) 