-- Create view for columns
CREATE OR REPLACE VIEW columns AS
SELECT 
  table_schema as schema,
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns;

-- Create view for constraints
CREATE OR REPLACE VIEW pg_constraint AS
SELECT 
  conname,
  conrelid,
  contype
FROM pg_catalog.pg_constraint;

-- Grant access to authenticated users
GRANT SELECT ON columns TO authenticated;
GRANT SELECT ON pg_constraint TO authenticated; 