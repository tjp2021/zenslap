# PostgREST Relationship Hell: A Case Study in Pain

## The Problem

We're trying to query ticket activities with their related tickets and actors using PostgREST's foreign key relationships. The query keeps failing with various errors:

1. First Error:
```
"Could not find a relationship between 'ticket_activities' and 'tickets' in the schema cache"
```

2. Second Error:
```
"column tickets_1.assigned_to does not exist"
```

3. Third Error:
```
"Could not find a relationship between 'ticket_activities' and 'tickets' using the hint 'ta_ticket_id_fkey' in the schema 'public'"
```

## Root Causes

1. **Multiple Sources of Truth**:
   - Local migrations
   - Production database
   - TypeScript types
   - Migration history
   All of these can be out of sync, making it impossible to know what's actually true.

2. **PostgREST's Brittle Relationship Syntax**:
   - Must use EXACT constraint names
   - Must use EXACT path references
   - No helpful error messages
   - Schema cache issues

3. **Local vs Production Mismatch**:
   - Local migrations creating different constraints
   - Production has its own state
   - No way to easily verify what's in production

## Our Failed Attempts

### Attempt 1: Fix Local Migrations
```sql
ALTER TABLE ticket_activities
ADD CONSTRAINT ticket_activities_ticket_fk 
FOREIGN KEY (ticket_id) 
REFERENCES tickets(id)
ON DELETE CASCADE;
```
Failed because: Local migrations don't match production reality

### Attempt 2: Update Query Path
```typescript
ticket:tickets!ticket_activities_ticket_id_fkey (
  id,
  title,
  created_by,
  assigned_to  // Wrong column name!
)
```
Failed because: We were guessing at column names instead of checking production

### Attempt 3: Drop and Recreate Constraints
```sql
DO $$ 
BEGIN
    EXECUTE (
        SELECT string_agg('ALTER TABLE ticket_activities DROP CONSTRAINT IF EXISTS ' || quote_ident(conname) || ' CASCADE;', E'\n')
        FROM pg_constraint
        WHERE conrelid = 'ticket_activities'::regclass
    );
END $$;
```
Failed because: We were still working with local DB, not production

### Attempt 4: Schema Constants
```typescript
export const SCHEMA = {
  RELATIONSHIPS: {
    TICKET_ACTIVITIES: {
      TICKET: {
        path: 'tickets!ticket_activities_ticket_id_fkey',
        fields: {
          id: 'id',
          title: 'title',
          created_by: 'created_by',
          assignee: 'assignee'
        }
      }
    }
  }
}
```
Failed because: Still doesn't solve the fundamental problem of not knowing production state

## The ACTUAL Solution Needed

1. **Production First**:
   - Pull schema from production
   - Generate types from production
   - Verify constraints in production
   - Stop relying on local state

2. **Schema Validation**:
   - Create type-safe query builders
   - Validate queries against production schema
   - Use constants for relationship paths
   - Add runtime checks for schema mismatches

3. **Better Development Flow**:
   - Always sync with production schema first
   - Generate types from production
   - Validate migrations against production
   - Add tests for schema compatibility

## Lessons Learned

1. **NEVER Trust Local State**:
   - Production is the only source of truth
   - Local migrations are lies
   - Always verify against production

2. **PostgREST Quirks**:
   - Relationship names must be exact
   - Path references must be exact
   - Schema cache is critical
   - Error messages are useless

3. **Schema Management**:
   - Need single source of truth
   - Need type safety
   - Need validation
   - Need better tooling

## Going Forward

1. Create proper schema management:
   ```typescript
   // Generated from PRODUCTION
   const SCHEMA = {
     tables: {
       ticket_activities: {
         constraints: {
           // Exact names from production
         },
         columns: {
           // Exact columns from production
         }
       }
     }
   }
   ```

2. Create type-safe query builder:
   ```typescript
   const query = createQuery('ticket_activities')
     .withRelation(SCHEMA.constraints.ticket)
     .select(SCHEMA.columns.ticket)
     .filterBy(SCHEMA.columns.assignee)
   ```

3. Add schema validation:
   ```typescript
   // Validate local against production
   validateSchema({
     local: localSchema,
     production: productionSchema
   })
   ``` 