-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum for analysis types
CREATE TYPE analysis_type AS ENUM (
  'sentiment',
  'priority',
  'category',
  'response',
  'urgency'
);

-- Grant permissions for the analysis_type enum
GRANT USAGE ON TYPE public.analysis_type TO anon;
GRANT USAGE ON TYPE public.analysis_type TO authenticated;
GRANT USAGE ON TYPE public.analysis_type TO service_role;

-- Create the ai_analyses table
CREATE TABLE ai_analyses (
  -- Core fields (immutable)
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id UUID NOT NULL,
  type analysis_type NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Analysis results (immutable)
  result JSONB NOT NULL,
  confidence FLOAT NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  model_info JSONB NOT NULL,
  
  -- Metadata (mutable)
  feedback_score INT CHECK (feedback_score >= -1 AND feedback_score <= 1),
  feedback_notes TEXT,
  is_validated BOOLEAN DEFAULT false,
  validated_at TIMESTAMPTZ,
  validated_by UUID,
  
  -- Version control
  version INT NOT NULL DEFAULT 1,
  
  -- Constraints
  CONSTRAINT valid_result CHECK (jsonb_typeof(result) = 'object'),
  CONSTRAINT valid_model_info CHECK (
    model_info ? 'name' AND 
    model_info ? 'version' AND
    jsonb_typeof(model_info) = 'object'
  )
);

-- Add indexes for common queries
CREATE INDEX idx_ai_analyses_ticket_id ON ai_analyses(ticket_id);
CREATE INDEX idx_ai_analyses_type ON ai_analyses(type);
CREATE INDEX idx_ai_analyses_created_at ON ai_analyses(created_at);
CREATE INDEX idx_ai_analyses_feedback ON ai_analyses(feedback_score) WHERE feedback_score IS NOT NULL;

-- Add a GiST index for JSONB querying
CREATE INDEX idx_ai_analyses_result ON ai_analyses USING gin (result jsonb_path_ops);

-- Add foreign key constraint
ALTER TABLE ai_analyses 
  ADD CONSTRAINT fk_ai_analyses_ticket 
  FOREIGN KEY (ticket_id) 
  REFERENCES tickets(id) 
  ON DELETE CASCADE;

-- Grant permissions for the AI tables
GRANT ALL ON TABLE public.ai_analyses TO anon;
GRANT ALL ON TABLE public.ai_analyses TO authenticated;
GRANT ALL ON TABLE public.ai_analyses TO service_role;

-- Enable RLS on the table
ALTER TABLE ai_analyses ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Allow read access to authenticated users"
  ON ai_analyses
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tickets t
      WHERE t.id = ai_analyses.ticket_id
      AND (
        t.created_by = auth.uid()
        OR t.assignee = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.users_secure us
          WHERE us.id = auth.uid()
          AND us.role IN ('admin', 'agent')
        )
      )
    )
  );

-- Allow insert access to service role only
CREATE POLICY "Allow insert access to service role"
  ON ai_analyses
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Allow feedback updates to authenticated users
CREATE POLICY "Allow feedback updates to authenticated users"
  ON ai_analyses
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tickets t
      WHERE t.id = ai_analyses.ticket_id
      AND (
        t.created_by = auth.uid()
        OR t.assignee = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.users_secure us
          WHERE us.id = auth.uid()
          AND us.role IN ('admin', 'agent')
        )
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tickets t
      WHERE t.id = ai_analyses.ticket_id
      AND (
        t.created_by = auth.uid()
        OR t.assignee = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.users_secure us
          WHERE us.id = auth.uid()
          AND us.role IN ('admin', 'agent')
        )
      )
    )
  );

-- Create function to validate analysis
CREATE OR REPLACE FUNCTION validate_analysis(
  analysis_id UUID,
  validator_id UUID
)
RETURNS void AS $$
BEGIN
  UPDATE ai_analyses
  SET 
    is_validated = true,
    validated_at = now(),
    validated_by = validator_id
  WHERE id = analysis_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on the validate_analysis function
GRANT EXECUTE ON FUNCTION validate_analysis(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION validate_analysis(UUID, UUID) TO service_role;

---- Down Migration ----
DROP FUNCTION IF EXISTS validate_analysis(UUID, UUID);
DROP POLICY IF EXISTS "Allow read access to authenticated users" ON ai_analyses;
DROP POLICY IF EXISTS "Allow insert access to service role" ON ai_analyses;
DROP POLICY IF EXISTS "Allow feedback updates to authenticated users" ON ai_analyses;
DROP TABLE IF EXISTS ai_analyses;
DROP TYPE IF EXISTS analysis_type;
