-- Create insight_feedback table
CREATE TABLE IF NOT EXISTS insight_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pattern_id TEXT NOT NULL,
  helpful BOOLEAN NOT NULL,
  accuracy FLOAT NOT NULL CHECK (accuracy >= 0 AND accuracy <= 1),
  relevance FLOAT NOT NULL CHECK (relevance >= 0 AND relevance <= 1),
  actionability TEXT NOT NULL,
  comments TEXT,
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Set up RLS
ALTER TABLE insight_feedback ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to insert feedback
CREATE POLICY "Users can insert their own feedback"
  ON insight_feedback
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Allow users to view their own feedback
CREATE POLICY "Users can view their own feedback"
  ON insight_feedback
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Allow users to update their own feedback
CREATE POLICY "Users can update their own feedback"
  ON insight_feedback
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create indexes
CREATE INDEX idx_insight_feedback_pattern_id ON insight_feedback(pattern_id);
CREATE INDEX idx_insight_feedback_user_id ON insight_feedback(user_id);
CREATE INDEX idx_insight_feedback_created_at ON insight_feedback(created_at); 