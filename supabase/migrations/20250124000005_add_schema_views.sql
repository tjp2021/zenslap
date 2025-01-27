-- Create view for columns
CREATE OR REPLACE VIEW schema_columns AS
SELECT 
  table_schema,
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns;

-- Create view for constraints
CREATE OR REPLACE VIEW schema_constraints AS
SELECT 
  conname,
  conrelid,
  contype
FROM pg_catalog.pg_constraint;

-- Grant access to authenticated users
GRANT SELECT ON schema_columns TO authenticated;
GRANT SELECT ON schema_constraints TO authenticated; 