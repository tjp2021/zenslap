# Row Level Security (RLS) Policies

## Overview

Row Level Security (RLS) policies in this project ensure that users can only access data they're authorized to see. These policies are enforced at the database level, providing a robust security layer regardless of how the data is accessed.

## Table Policies

### Tickets Table

```sql
-- Enable RLS
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;

-- Allow users to view tickets they have access to
CREATE POLICY "Users can view their tickets"
ON tickets FOR SELECT
USING (
  auth.uid() = created_by OR
  auth.uid() = assigned_to OR
  EXISTS (
    SELECT 1 FROM user_organizations uo
    WHERE uo.user_id = auth.uid()
    AND uo.organization_id = tickets.organization_id
  )
);

-- Allow users to create tickets
CREATE POLICY "Users can create tickets"
ON tickets FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL
);

-- Allow users to update their tickets
CREATE POLICY "Users can update their tickets"
ON tickets FOR UPDATE
USING (
  auth.uid() = created_by OR
  auth.uid() = assigned_to OR
  EXISTS (
    SELECT 1 FROM user_organizations uo
    WHERE uo.user_id = auth.uid()
    AND uo.organization_id = tickets.organization_id
    AND uo.role IN ('admin', 'manager')
  )
);

-- Allow users to delete their tickets
CREATE POLICY "Users can delete their tickets"
ON tickets FOR DELETE
USING (
  auth.uid() = created_by OR
  EXISTS (
    SELECT 1 FROM user_organizations uo
    WHERE uo.user_id = auth.uid()
    AND uo.organization_id = tickets.organization_id
    AND uo.role = 'admin'
  )
);
```

### Tags Table

```sql
-- Enable RLS
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view tags
CREATE POLICY "Users can view tags"
ON tags FOR SELECT
USING (
  auth.uid() IS NOT NULL
);

-- Allow users to create tags
CREATE POLICY "Users can create tags"
ON tags FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM user_organizations uo
    WHERE uo.user_id = auth.uid()
    AND uo.role IN ('admin', 'manager')
  )
);

-- Allow users to update tags
CREATE POLICY "Users can update tags"
ON tags FOR UPDATE
USING (
  auth.uid() IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM user_organizations uo
    WHERE uo.user_id = auth.uid()
    AND uo.role IN ('admin', 'manager')
  )
);

-- Allow users to delete tags
CREATE POLICY "Users can delete tags"
ON tags FOR DELETE
USING (
  auth.uid() IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM user_organizations uo
    WHERE uo.user_id = auth.uid()
    AND uo.role = 'admin'
  )
);
```

### Users Table

```sql
-- Enable RLS
ALTER TABLE users_secure ENABLE ROW LEVEL SECURITY;

-- Allow users to view other users in their organization
CREATE POLICY "Users can view organization members"
ON users_secure FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_organizations uo1
    JOIN user_organizations uo2 ON uo1.organization_id = uo2.organization_id
    WHERE uo1.user_id = auth.uid()
    AND uo2.user_id = users_secure.id
  )
);
```

## Testing RLS Policies

### Manual Testing

1. **Authentication States**
   - Test with authenticated user
   - Test with unauthenticated user
   - Test with different user roles

2. **Access Patterns**
   - Test SELECT operations
   - Test INSERT operations
   - Test UPDATE operations
   - Test DELETE operations

3. **Edge Cases**
   - Test organization boundaries
   - Test role-based access
   - Test nested permissions

### Automated Testing

```typescript
describe('RLS Policies', () => {
  it('should allow users to view their tickets', async () => {
    const { data, error } = await supabase
      .from('tickets')
      .select('*')
    
    expect(error).toBeNull()
    expect(data).toBeDefined()
    // Add more specific assertions
  })

  // Add more test cases for other policies
})
```

## Common Issues

1. **Missing Policies**
   - Symptom: "new row violates row-level security policy"
   - Solution: Ensure appropriate policies are created for all operations

2. **Policy Conflicts**
   - Symptom: Unexpected access denials
   - Solution: Review and simplify overlapping policies

3. **Performance Impact**
   - Symptom: Slow queries with complex policies
   - Solution: Optimize policy conditions and indexes

## Best Practices

1. **Policy Design**
   - Keep policies simple and focused
   - Use appropriate indexes for policy conditions
   - Document policy intentions and requirements

2. **Security**
   - Always enable RLS on new tables
   - Test policies thoroughly
   - Review policies during schema changes

3. **Maintenance**
   - Keep policies in version control
   - Update policies when business rules change
   - Monitor policy performance 