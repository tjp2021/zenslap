-- Add crisis analysis type to the enum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'analysis_type') THEN
        CREATE TYPE analysis_type AS ENUM ('crisis');
    ELSE
        ALTER TYPE analysis_type ADD VALUE IF NOT EXISTS 'crisis';
    END IF;
END$$;

COMMIT;

-- Add index for crisis analyses
DO $$
BEGIN
    CREATE INDEX IF NOT EXISTS idx_ai_analyses_crisis 
    ON ai_analyses(ticket_id, type, created_at DESC) 
    WHERE type = 'crisis';
END$$;

-- Add validation check for crisis analysis results
ALTER TABLE ai_analyses 
ADD CONSTRAINT valid_crisis_result 
CHECK (
  type != 'crisis' OR (
    jsonb_typeof(result) = 'object' AND
    result ? 'crisis_type' AND
    result ? 'severity_level' AND
    result ? 'requires_immediate' AND
    result ? 'response_protocol'
  )
); 