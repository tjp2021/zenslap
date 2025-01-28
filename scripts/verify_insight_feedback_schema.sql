-- Verify the enum type exists
SELECT EXISTS (
  SELECT 1 FROM pg_type 
  WHERE typname = 'feedback_rating'
) as feedback_rating_type_exists;

-- Verify the column types
SELECT 
  column_name,
  data_type,
  udt_name
FROM information_schema.columns 
WHERE table_name = 'insight_feedback'
  AND column_name IN ('accuracy', 'relevance', 'actionability');

-- Verify the constraints
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'insight_feedback'::regclass; 