-- Check if the table exists
SELECT EXISTS (
    SELECT 1 
    FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'ai_analyses'
) as table_exists;

-- Check enum type
SELECT EXISTS (
    SELECT 1 
    FROM pg_type 
    WHERE typname = 'analysis_type'
) as enum_exists;

-- List all constraints if table exists
SELECT conname, contype, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'public.ai_analyses'::regclass;

-- Check RLS policies if table exists
SELECT tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'ai_analyses';

-- Check indexes if table exists
SELECT 
    i.relname as index_name,
    a.attname as column_name,
    ix.indisunique as is_unique,
    ix.indisprimary as is_primary
FROM pg_class t
JOIN pg_index ix ON t.oid = ix.indrelid
JOIN pg_class i ON ix.indexrelid = i.oid
JOIN pg_attribute a ON t.oid = a.attrelid
WHERE t.relname = 'ai_analyses'
AND a.attnum = ANY(ix.indkey)
AND t.relkind = 'r'; 