# Supabase Migration Manager

A robust migration management system that implements lessons learned from POSTGREST_HELL analysis and enforces best practices for Supabase migrations.

## Key Features

1. **Pre-flight Checks**
   - Backup status verification
   - Connection pool monitoring
   - Disk space validation
   - Dependency checking
   - Object existence verification

2. **Structured Migrations**
   - Enforced ordering of operations
   - Step-by-step execution
   - Verification after each step
   - Automatic rollback generation

3. **Comprehensive Verification**
   - Table structure validation
   - Constraint checking
   - Index verification
   - Permission validation
   - RLS policy confirmation

4. **Safety Features**
   - Transaction-based execution
   - Automatic rollback scripts
   - Detailed logging
   - State verification

## Installation

```bash
pip install -r requirements.txt
```

## Configuration

1. Copy `config.json.template` to `supabase/config.json`
2. Update database credentials and settings
3. Adjust safety thresholds as needed

## Usage

### Basic Usage

```bash
python migration_manager.py <migration_file> <table_name>
```

### Example

```bash
python migration_manager.py migrations/20250128102000_create_users.sql users
```

## Migration File Structure

Follow this template for migrations:

```sql
-- Step 1: Drop existing objects with CASCADE
DROP TYPE IF EXISTS my_type CASCADE;

-- Step 2: Create types
CREATE TYPE my_type AS ENUM (...);

-- Step 3: Create base table
CREATE TABLE my_table (...);

-- Step 4: Add constraints
ALTER TABLE my_table ADD CONSTRAINT ...;

-- Step 5: Create indexes
CREATE INDEX ...;

-- Step 6: Set permissions
GRANT ... TO ...;

-- Step 7: Enable RLS
ALTER TABLE ... ENABLE ROW LEVEL SECURITY;

-- Step 8: Create policies
CREATE POLICY ...;
```

## Verification

The system automatically verifies:
- Table existence
- Column structure
- Constraints
- Indexes
- RLS policies
- Permissions

## Logging

Logs are written to:
- Console (INFO level)
- migrations.log (all levels)

## Error Handling

1. **Pre-flight Failures**
   - Detailed error messages
   - Suggested remediation steps
   - No changes made to database

2. **Migration Failures**
   - Automatic rollback
   - Generated rollback script
   - Detailed error logs

## Best Practices

1. **Always Follow the Template**
   - Use provided step structure
   - Include clear step comments
   - Maintain operation order

2. **Verify Everything**
   - Check pre-flight results
   - Monitor step verification
   - Validate final state

3. **Use Rollbacks**
   - Keep generated rollback scripts
   - Test rollbacks before production
   - Document manual recovery steps

## Anti-Patterns Avoided

1. **No Mixed Paradigms**
   - Pure DDL statements only
   - No procedural SQL in migrations
   - Clean separation of concerns

2. **No Blind Trust**
   - Verify all operations
   - Check actual database state
   - Validate all changes

3. **No Complex Logic**
   - Simple, direct operations
   - Clear, linear execution
   - Predictable outcomes

## Troubleshooting

### Common Issues

1. **Pre-flight Check Failures**
   ```
   Check logs for specific failure
   Address identified issues
   Re-run migration
   ```

2. **Verification Failures**
   ```
   Review step output
   Check actual database state
   Consult verification logs
   ```

3. **Rollback Issues**
   ```
   Use generated rollback script
   Check rollback logs
   Manual intervention if needed
   ```

## Contributing

1. Follow the established patterns
2. Add tests for new features
3. Update documentation
4. Maintain safety first approach

## License

MIT
