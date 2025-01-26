-- Create view for columns
CREATE OR REPLACE VIEW columns AS
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public';

-- Create view for constraints
CREATE OR REPLACE VIEW table_constraints AS
SELECT 
  constraint_name,
  table_name,
  constraint_type
FROM information_schema.table_constraints
WHERE table_schema = 'public';

-- Grant access to authenticated users
GRANT SELECT ON columns TO authenticated;
GRANT SELECT ON table_constraints TO authenticated; 