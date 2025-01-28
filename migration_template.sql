-- Step 1: Drop existing objects with CASCADE
DROP TYPE IF EXISTS my_type CASCADE;
DROP TABLE IF EXISTS my_table CASCADE;

-- Step 2: Create types (if needed)
CREATE TYPE my_type AS ENUM (
    'value1',
    'value2'
);

-- Step 3: Create base table with minimal structure
CREATE TABLE my_table (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Step 4: Add constraints
ALTER TABLE my_table 
    ADD CONSTRAINT my_table_some_check CHECK (/* condition */);

-- Step 5: Create indexes
CREATE INDEX idx_my_table_created_at ON my_table(created_at);

-- Step 6: Set basic permissions
GRANT ALL ON my_table TO authenticated;
GRANT ALL ON my_table TO service_role;

-- Step 7: Enable RLS
ALTER TABLE my_table ENABLE ROW LEVEL SECURITY;

-- Step 8: Create policies
CREATE POLICY "Users can view their own data" ON my_table
    FOR SELECT
    USING (auth.uid() = user_id);  -- Assumes user_id column exists

-- Step 9: Create triggers (if needed)
CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON my_table
    FOR EACH ROW
    EXECUTE FUNCTION moddatetime(); 