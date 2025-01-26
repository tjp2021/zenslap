-- Create function to execute schema queries
CREATE OR REPLACE FUNCTION get_schema_info(query text)
RETURNS JSONB
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  result JSONB;
BEGIN
  -- Ensure query only accesses information_schema
  IF query !~ '^SELECT\s+jsonb_agg\s*\(' THEN
    RAISE EXCEPTION 'Query must use jsonb_agg for results';
  END IF;

  IF query !~ 'FROM\s+information_schema\.' THEN
    RAISE EXCEPTION 'Query must only access information_schema';
  END IF;

  -- Execute query and convert result to JSONB
  EXECUTE query INTO result;
  
  -- Return empty array if null
  RETURN COALESCE(result, '[]'::JSONB);
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error executing query: %', SQLERRM;
    RETURN '[]'::JSONB;
END;
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION get_schema_info(text) TO authenticated; 