# PostgreSQL Migration Guidelines for Supabase

This document provides comprehensive guidelines for handling database migrations in Supabase, based on hard-learned lessons from production issues. Following these guidelines will help prevent common pitfalls and reduce debugging time.

## Core Principles

1. **Explicit Over Implicit**
   - Migrations should be explicit about what they're doing
   - Avoid any operations that mask failures
   - Let failures happen fast and loud
   - Never trust migration success messages without verification

2. **Clean Over Clever**
   - Keep migrations simple and straightforward
   - Avoid mixing different SQL paradigms
   - One logical change per migration
   - Follow consistent ordering of operations

3. **Verify Over Trust**
   - Always verify actual database state
   - Don't trust CLI status messages
   - Check real table structures after migration
   - Use explicit verification queries

## Migration Template

### Standard Migration Structure
```sql
-- 1. Drop dependencies (ALWAYS use CASCADE)
DROP TYPE IF EXISTS my_type CASCADE;
DROP TABLE IF EXISTS my_table CASCADE;

-- 2. Create/modify types
CREATE TYPE status_enum AS ENUM ('active', 'pending', 'inactive');

-- 3. Create base tables
CREATE TABLE my_table (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Add constraints and foreign keys
ALTER TABLE my_table
    ADD CONSTRAINT fk_other_table
    FOREIGN KEY (other_id) REFERENCES other_table(id);

-- 5. Create indexes
CREATE INDEX idx_my_table_status ON my_table(status);

-- 6. Set up RLS
ALTER TABLE my_table ENABLE ROW LEVEL SECURITY;

-- 7. Create policies
CREATE POLICY "Users can view own data" ON my_table
    FOR SELECT USING (auth.uid() = user_id);

-- 8. Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON my_table TO authenticated;

-- 9. Handle realtime (if needed)
ALTER PUBLICATION supabase_realtime ADD TABLE my_table;

-- 10. Create triggers (if needed)
CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON my_table
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();
```

## Anti-Patterns to Avoid

### 1. Silent Failure Points
```sql
-- ANTI-PATTERN ❌
ALTER TABLE notifications 
    ADD COLUMN IF NOT EXISTS ai_analysis_id UUID,
    ADD COLUMN IF NOT EXISTS priority TEXT;

-- CORRECT APPROACH ✅
ALTER TABLE notifications 
    ADD COLUMN ai_analysis_id UUID,
    ADD COLUMN priority TEXT;
```

### 2. Mixed SQL Paradigms
```sql
-- ANTI-PATTERN ❌
DO $$ 
BEGIN
    CREATE TABLE IF NOT EXISTS my_table (...);
END $$;

-- CORRECT APPROACH ✅
DROP TABLE IF EXISTS my_table CASCADE;
CREATE TABLE my_table (...);
```

### 3. Circular Dependencies
```sql
-- ANTI-PATTERN ❌
CREATE TABLE table_a (
    id UUID PRIMARY KEY,
    table_b_id UUID REFERENCES table_b(id)
);
CREATE TABLE table_b (
    id UUID PRIMARY KEY,
    table_a_id UUID REFERENCES table_a(id)
);

-- CORRECT APPROACH ✅
CREATE TABLE table_a (
    id UUID PRIMARY KEY
);
CREATE TABLE table_b (
    id UUID PRIMARY KEY,
    table_a_id UUID
);
ALTER TABLE table_b 
    ADD CONSTRAINT fk_table_a 
    FOREIGN KEY (table_a_id) REFERENCES table_a(id);
ALTER TABLE table_a 
    ADD COLUMN table_b_id UUID,
    ADD CONSTRAINT fk_table_b 
    FOREIGN KEY (table_b_id) REFERENCES table_b(id);
```

## Common Edge Cases & Solutions

### 1. Type Modifications
```sql
-- Problem: Changing enum type values
-- ANTI-PATTERN ❌
ALTER TYPE status_enum ADD VALUE 'new_status';

-- CORRECT APPROACH ✅
-- 1. Create new type
CREATE TYPE status_enum_new AS ENUM ('active', 'pending', 'inactive', 'new_status');

-- 2. Update tables to use new type
ALTER TABLE my_table 
    ALTER COLUMN status TYPE status_enum_new 
    USING status::text::status_enum_new;

-- 3. Drop old type
DROP TYPE status_enum;

-- 4. Rename new type
ALTER TYPE status_enum_new RENAME TO status_enum;
```

### 2. Publication Management
```sql
-- Problem: Altering publications
-- ANTI-PATTERN ❌
ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS my_table;

-- CORRECT APPROACH ✅
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND tablename = 'my_table'
    ) THEN
        ALTER PUBLICATION supabase_realtime DROP TABLE my_table;
    END IF;
END $$;
```

### 3. Policy Updates
```sql
-- Problem: Updating policies
-- ANTI-PATTERN ❌
DROP POLICY IF EXISTS "Old policy" ON my_table;
CREATE POLICY "New policy" ON my_table ...;

-- CORRECT APPROACH ✅
-- 1. First migration: Add new policy
CREATE POLICY "New policy" ON my_table ...;

-- 2. Second migration: Remove old policy
DROP POLICY "Old policy" ON my_table;
```

## Verification Checklist

### Before Migration
1. Check current state:
```sql
SELECT table_name, table_schema 
FROM information_schema.tables 
WHERE table_schema = 'public';
```

2. Verify dependencies:
```sql
SELECT 
    tc.table_schema, 
    tc.constraint_name, 
    tc.table_name, 
    kcu.column_name,
    ccu.table_schema AS foreign_table_schema,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY';
```

### After Migration
1. Verify table structure:
```sql
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM 
    information_schema.columns
WHERE 
    table_schema = 'public' 
    AND table_name = 'my_table';
```

2. Check policies:
```sql
SELECT * FROM pg_policies WHERE tablename = 'my_table';
```

3. Verify publications:
```sql
SELECT * FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime';
```

## Troubleshooting Guide

### 1. Migration Not Applying
```bash
# 1. Check migration status
supabase migration list

# 2. Compare local and remote
supabase db diff --linked

# 3. Reset if needed
supabase db reset

# 4. Force push with all migrations
supabase db push --include-all
```

### 2. Dependency Issues
```sql
-- Find dependent objects
SELECT 
    dependent_ns.nspname as dependent_schema,
    dependent_view.relname as dependent_view 
FROM pg_depend 
JOIN pg_rewrite ON pg_depend.objid = pg_rewrite.oid 
JOIN pg_class as dependent_view ON pg_rewrite.ev_class = dependent_view.oid 
JOIN pg_class as source_table ON pg_depend.refobjid = source_table.oid 
JOIN pg_namespace dependent_ns ON dependent_view.relnamespace = dependent_ns.oid 
JOIN pg_namespace source_ns ON source_table.relnamespace = source_ns.oid 
WHERE 
    source_ns.nspname = 'public'
    AND source_table.relname = 'my_table';
```

### 3. Permission Issues
```sql
-- Check current permissions
SELECT 
    grantee, privilege_type 
FROM 
    information_schema.role_table_grants 
WHERE 
    table_name = 'my_table';
```

## Best Practices for Complex Scenarios

### 1. Large Data Migrations
- Split into smaller batches
- Use temporary tables for staging
- Implement rollback mechanisms
- Verify data integrity at each step

### 2. Schema Changes with Existing Data
- Add new structures first
- Migrate data in batches
- Remove old structures last
- Keep both versions during transition

### 3. Performance Considerations
- Add indexes after data insertion
- Use temporary indexes for migrations
- Drop unused indexes
- Monitor lock contention

## Development Workflow

1. **Planning Phase**
   - Document current state
   - List all required changes
   - Identify dependencies
   - Plan rollback strategy

2. **Development Phase**
   - Create migration in isolation
   - Follow template structure
   - Add verification queries
   - Test locally first

3. **Testing Phase**
   - Test in clean environment
   - Verify all objects created
   - Check permissions work
   - Validate rollback works

4. **Deployment Phase**
   - Backup production data
   - Apply migration
   - Run verification suite
   - Document any issues

## Emergency Rollback Procedures

1. **Quick Rollback Template**
```sql
-- Save in separate rollback file
BEGIN;
    -- 1. Disable triggers
    ALTER TABLE my_table DISABLE TRIGGER ALL;
    
    -- 2. Drop new objects
    DROP TABLE IF EXISTS my_table CASCADE;
    
    -- 3. Restore from backup if needed
    -- 4. Re-enable triggers
    ALTER TABLE my_table ENABLE TRIGGER ALL;
COMMIT;
```

2. **State Recovery**
```sql
-- Verify current state
SELECT current_database(), current_user, current_timestamp;

-- Check transaction status
SELECT txid_current(), pg_backend_pid();

-- Kill blocking queries if needed
SELECT pg_terminate_backend(pid) 
FROM pg_stat_activity 
WHERE datname = current_database() 
AND pid <> pg_backend_pid();
```

Remember: The goal is to prevent issues before they occur. When in doubt, be explicit, verify everything, and document what you learn. 

## Appendix: Real-World Examples

### Example 1: Real-time Monitoring Tables Migration

#### Initial Problem
```sql
-- ANTI-PATTERN ❌: Multiple conflicting migrations
-- First migration
CREATE TABLE message_queue (...);
CREATE TABLE audit_log (...);

-- Second migration trying to create same tables
CREATE TABLE IF NOT EXISTS message_queue (...);
CREATE TABLE IF NOT EXISTS audit_log (...);
```

#### What Went Wrong
1. Multiple migrations attempting to create same tables
2. IF NOT EXISTS masking failures
3. Migration history got out of sync
4. Local state masking production issues

#### Working Solution
```sql
-- Clean, single migration with proper order
-- 1. Drop everything with CASCADE
DROP TYPE IF EXISTS message_status CASCADE;
DROP TYPE IF EXISTS event_type CASCADE;
DROP TYPE IF EXISTS metric_type CASCADE;

-- 2. Create types first
CREATE TYPE message_status AS ENUM ('pending', 'processing', 'completed', 'failed');
CREATE TYPE event_type AS ENUM ('message', 'alert', 'notification');
CREATE TYPE metric_type AS ENUM ('latency', 'throughput', 'error_rate');

-- 3. Create base tables
CREATE TABLE message_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    status message_status NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Add indexes and triggers after table creation
CREATE INDEX idx_message_queue_status ON message_queue(status);
CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON message_queue
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();

-- 5. Set up RLS last
ALTER TABLE message_queue ENABLE ROW LEVEL SECURITY;
```

### Example 2: Silent AI Analysis Migration Failure

#### Initial Problem
```sql
-- ANTI-PATTERN ❌: Silent failures with IF NOT EXISTS
ALTER TABLE notifications 
    ADD COLUMN IF NOT EXISTS ai_analysis_id UUID,
    ADD COLUMN IF NOT EXISTS priority TEXT,
    ADD COLUMN IF NOT EXISTS analysis_status TEXT;

-- Migration marked as success but columns weren't added
```

#### What Went Wrong
1. IF NOT EXISTS masked actual errors
2. Migration showed as successful in history
3. Application code assumed columns existed
4. Production bugs only discovered at runtime

#### Working Solution
```sql
-- First migration: Add columns explicitly
ALTER TABLE notifications 
    ADD COLUMN ai_analysis_id UUID,
    ADD COLUMN priority TEXT,
    ADD COLUMN analysis_status TEXT;

-- Second migration: Add constraints after data migration
ALTER TABLE notifications
    ALTER COLUMN priority SET NOT NULL,
    ADD CONSTRAINT fk_ai_analysis
        FOREIGN KEY (ai_analysis_id)
        REFERENCES ai_analyses(id);

-- Third migration: Add indexes for performance
CREATE INDEX idx_notifications_analysis_id ON notifications(ai_analysis_id);
CREATE INDEX idx_notifications_priority ON notifications(priority);
```

### Example 3: Crisis Detection Schema Evolution

#### Initial Problem
```sql
-- ANTI-PATTERN ❌: Mixing DDL and procedural SQL
DO $$ 
BEGIN
    -- Create enum if not exists
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'crisis_type') THEN
        CREATE TYPE crisis_type AS ENUM (
            'suicide_risk',
            'self_harm',
            'panic_attack'
        );
    END IF;
    
    -- Alter table with complex logic
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'tickets' 
        AND column_name = 'crisis_type'
    ) THEN
        ALTER TABLE tickets ADD COLUMN crisis_type crisis_type;
    END IF;
END $$;
```

#### What Went Wrong
1. Mixed DDL with procedural SQL
2. Complex error handling masked issues
3. Circular dependencies between types and tables
4. Inconsistent state between local and production

#### Working Solution
```sql
-- 1. Clean migration for type creation
DROP TYPE IF EXISTS crisis_type CASCADE;
CREATE TYPE crisis_type AS ENUM (
    'suicide_risk',
    'self_harm',
    'panic_attack'
);

-- 2. Separate migration for table changes
ALTER TABLE tickets 
    ADD COLUMN crisis_type crisis_type,
    ADD COLUMN severity_level TEXT,
    ADD COLUMN response_protocol TEXT;

-- 3. Separate migration for constraints and indexes
ALTER TABLE tickets
    ADD CONSTRAINT valid_severity_level 
        CHECK (severity_level IN ('critical', 'high', 'medium', 'low')),
    ADD CONSTRAINT valid_response_protocol 
        CHECK (response_protocol IS NOT NULL WHEN crisis_type IS NOT NULL);

CREATE INDEX idx_tickets_crisis 
    ON tickets(crisis_type, severity_level);

-- 4. Final migration for trigger
CREATE OR REPLACE FUNCTION update_crisis_assessment_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_crisis_assessment_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_crisis_timestamp
    BEFORE UPDATE OF crisis_type, severity_level
    ON tickets
    FOR EACH ROW
    EXECUTE FUNCTION update_crisis_assessment_timestamp();
```

### Example 4: Publication Management for Real-time Features

#### Initial Problem
```sql
-- ANTI-PATTERN ❌: Unsafe publication management
ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS message_queue;
ALTER PUBLICATION supabase_realtime ADD TABLE message_queue;
```

#### What Went Wrong
1. IF EXISTS on publication operations caused issues
2. No verification of publication state
3. Inconsistent real-time behavior in production

#### Working Solution
```sql
-- 1. Safe publication management
DO $$ 
BEGIN
    -- First remove table if it's in any publication
    IF EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE tablename = 'message_queue'
    ) THEN
        ALTER PUBLICATION supabase_realtime DROP TABLE message_queue;
    END IF;
    
    -- Then add to publication
    ALTER PUBLICATION supabase_realtime ADD TABLE message_queue;
END $$;

-- 2. Verify publication setup
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND tablename = 'message_queue'
    ) THEN
        RAISE EXCEPTION 'Publication setup failed for message_queue';
    END IF;
END $$;
```

These examples demonstrate common pitfalls and their solutions based on real production issues we've encountered. They serve as practical references for handling similar situations in future migrations. 

## Migration Hell Case Study

### Key Lessons from Real-time Monitoring Tables Migration

1. **Migration Order Matters**
   - Dependencies must be handled in correct order
   - Use CASCADE drops to prevent orphaned objects
   - Follow sequence: types → tables → policies

2. **Supabase CLI Behavior**
   - Don't trust "up to date" messages
   - Use `--include-all` flag for force pushes
   - Always verify with `db diff`

3. **SQL Best Practices**
   - Keep DDL statements clean and simple
   - Avoid procedural SQL in migrations
   - Use CASCADE for dependency cleanup

### Anti-Patterns to Avoid

1. **Migration Anti-Patterns**
   - Mixing DDL and procedural SQL
   - Trusting local state blindly
   - Complex error handling in migrations

2. **Process Anti-Patterns**
   - Multiple migrations targeting same objects
   - Fixing migrations instead of replacing
   - Ignoring migration history

3. **SQL Anti-Patterns**
   - IF EXISTS without CASCADE
   - Complex procedural blocks
   - Circular dependencies

### Debugging Steps
1. Check production state first
2. Create clean migrations instead of fixing old ones
3. Test migrations in isolation
4. Use `db diff` to verify actual state
5. Check migration history with `migration list`
6. Repair migration history only as last resort

### Correct Migration Structure
```sql
-- 1. Drop types with CASCADE
DROP TYPE IF EXISTS my_type CASCADE;

-- 2. Create types
CREATE TYPE my_type AS ENUM (...);

-- 3. Create tables
CREATE TABLE my_table (...);

-- 4. Create indexes
CREATE INDEX idx_my_table_field ON my_table(...);

-- 5. Set up RLS
ALTER TABLE my_table ENABLE ROW LEVEL SECURITY;

-- 6. Create policies
CREATE POLICY "policy_name" ON my_table ...;
``` 