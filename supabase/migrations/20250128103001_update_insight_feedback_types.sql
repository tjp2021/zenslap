-- 1. Create the new enum type
CREATE TYPE feedback_rating AS ENUM ('high', 'medium', 'low', 'neutral');

-- 2. Create a new table with the correct types
CREATE TABLE insight_feedback_new (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  pattern_id text NOT NULL,
  helpful boolean NOT NULL,
  accuracy feedback_rating NOT NULL,
  relevance feedback_rating NOT NULL,
  actionability feedback_rating NOT NULL,
  comments text,
  user_id text,
  created_at timestamp with time zone DEFAULT now()
);

-- 3. Copy data with conversion
INSERT INTO insight_feedback_new (
  id, pattern_id, helpful, accuracy, relevance, actionability, comments, user_id, created_at
)
SELECT 
  id, 
  pattern_id, 
  helpful,
  CASE 
    WHEN accuracy::text::numeric > 0.7 THEN 'high'::feedback_rating
    WHEN accuracy::text::numeric > 0.4 THEN 'medium'::feedback_rating
    WHEN accuracy::text::numeric > 0.1 THEN 'low'::feedback_rating
    ELSE 'neutral'::feedback_rating
  END as accuracy,
  CASE 
    WHEN relevance::text::numeric > 0.7 THEN 'high'::feedback_rating
    WHEN relevance::text::numeric > 0.4 THEN 'medium'::feedback_rating
    WHEN relevance::text::numeric > 0.1 THEN 'low'::feedback_rating
    ELSE 'neutral'::feedback_rating
  END as relevance,
  actionability::feedback_rating,
  comments,
  user_id,
  created_at
FROM insight_feedback;

-- 4. Drop the old table and rename the new one
DROP TABLE insight_feedback;
ALTER TABLE insight_feedback_new RENAME TO insight_feedback; 