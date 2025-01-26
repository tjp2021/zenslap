-- Create function to get columns
CREATE OR REPLACE FUNCTION get_columns()
RETURNS TABLE (
  table_name text,
  column_name text,
  data_type text,
  is_nullable text
) SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.table_name::text,
    c.column_name::text,
    c.data_type::text,
    c.is_nullable::text
  FROM information_schema.columns c
  WHERE c.table_schema = 'public';
END;
$$ LANGUAGE plpgsql;

-- Create function to get constraints
CREATE OR REPLACE FUNCTION get_constraints()
RETURNS TABLE (
  constraint_name text,
  table_name text,
  constraint_type text
) SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    tc.constraint_name::text,
    tc.table_name::text,
    tc.constraint_type::text
  FROM information_schema.table_constraints tc
  WHERE tc.table_schema = 'public';
END;
$$ LANGUAGE plpgsql;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION get_columns() TO authenticated;
GRANT EXECUTE ON FUNCTION get_constraints() TO authenticated; 