# Row Level Security (RLS) Policies Documentation

## Overview
This document provides a comprehensive overview of all Row Level Security (RLS) policies in the AutoCRM system. Each table's policies are documented with their SQL definitions and explanations.

## Core Security Functions

### Staff Check Function
```sql
CREATE OR REPLACE FUNCTION auth.is_staff()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users
    JOIN public.users_secure ON users_secure.id = users.id
    WHERE users.id = auth.uid()
    AND users_secure.role IN ('admin', 'agent')
  );
$$;
```
**Purpose**: Core security function used across policies
- Security definer function for safe role checks
- Used by other policies to verify staff status
- Prevents recursive policy issues
- Returns true if the current user is admin or agent

## Tables and Their Policies

### 1. Tickets Table
Manages access control for ticket creation, viewing, updating, and deletion.

#### View Policy
```sql
CREATE POLICY "tickets_select_policy" ON tickets
  FOR SELECT USING (
    auth.uid() = created_by 
    OR 
    EXISTS (
      SELECT 1 FROM users_secure
      WHERE users_secure.id = auth.uid()
      AND users_secure.role IN ('admin', 'agent')
    )
  );
```
**Purpose**: Controls which tickets users can view
- Users can view tickets they created
- Staff (admin/agent) can view all tickets

#### Insert Policy
```sql
CREATE POLICY "tickets_insert_policy" ON tickets
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
  );
```
**Purpose**: Controls ticket creation
- Any authenticated user can create tickets
- No additional restrictions

#### Update Policy
```sql
CREATE POLICY "tickets_update_policy" ON tickets
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users_secure
      WHERE users_secure.id = auth.uid()
      AND users_secure.role IN ('admin', 'agent')
    )
  );
```
**Purpose**: Controls ticket modification
- Only staff (admin/agent) can update tickets
- Regular users cannot update tickets

#### Delete Policy
```sql
CREATE POLICY "tickets_delete_policy" ON tickets
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM users_secure
      WHERE users_secure.id = auth.uid()
      AND users_secure.role = 'admin'
    )
  );
```
**Purpose**: Controls ticket deletion
- Only admins can delete tickets
- Agents and regular users cannot delete tickets

### 2. Ticket Activities Table
Manages access control for ticket comments, status changes, and other activities.

#### View Policy
```sql
CREATE POLICY view_ticket_activities ON ticket_activities
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM tickets t
            WHERE t.id = ticket_activities.ticket_id
            AND (
                -- Staff can see everything
                EXISTS (
                    SELECT 1 FROM users_secure us
                    WHERE us.id = auth.uid()
                    AND us.role IN ('admin', 'agent')
                )
                OR
                -- Regular users can only see non-internal content
                (
                    (t.assignee = auth.uid() OR t.assignee IS NULL)
                    AND
                    (
                        -- Either it's not a comment
                        activity_type != 'comment'
                        OR
                        -- Or it's a non-internal comment
                        (activity_type = 'comment' AND (content->>'is_internal')::boolean IS NOT TRUE)
                    )
                )
            )
        )
    );
```
**Purpose**: Controls visibility of ticket activities
- Staff can see all activities
- Regular users can only see:
  - Non-internal comments on their assigned tickets
  - All non-comment activities on their assigned tickets

#### Insert Policy
```sql
CREATE POLICY insert_ticket_activities ON ticket_activities
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM tickets t
            WHERE t.id = ticket_activities.ticket_id
            AND (
                -- Staff can add activities to any ticket
                EXISTS (
                    SELECT 1 FROM users_secure us
                    WHERE us.id = auth.uid()
                    AND us.role IN ('admin', 'agent')
                )
                OR
                -- Regular users can only add to their assigned tickets
                (t.assignee = auth.uid() OR t.assignee IS NULL)
            )
        )
    );
```
**Purpose**: Controls who can add activities
- Staff can add activities to any ticket
- Regular users can only add activities to:
  - Their assigned tickets
  - Unassigned tickets

#### Delete Policy
```sql
CREATE POLICY delete_ticket_activities ON ticket_activities
    FOR DELETE
    TO authenticated
    USING (
        -- Users can only delete their own activities
        actor_id = auth.uid()
    );
```
**Purpose**: Controls activity deletion
- Users can only delete their own activities
- No special privileges for staff

### 3. Users Secure Table
Manages access control for user profiles and information.

#### View Policy
```sql
CREATE POLICY "users_secure_access" ON public.users_secure
FOR SELECT TO authenticated
USING (
  -- Users can see their own profile
  id = auth.uid()
  OR
  -- Everyone can see staff profiles
  role IN ('admin', 'agent')
);
```
**Purpose**: Controls who can view user profiles
- Users can see their own full profile
- Everyone can see staff profiles
- No column-level restrictions are implemented

#### Update Policy
```sql
CREATE POLICY update_users_secure ON users_secure
    FOR UPDATE
    TO authenticated
    USING (
        -- Users can only update their own profile
        id = auth.uid()
    );
```
**Purpose**: Controls profile updates
- Users can only update their own profile
- No special privileges for staff

### 4. Notifications Table
Manages access control for user notifications.

#### View Policy
```sql
CREATE POLICY "Users can view own notifications"
    ON notifications FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);
```
**Purpose**: Controls notification visibility
- Users can only see their own notifications

#### Update Policy
```sql
CREATE POLICY "Users can update own notifications"
    ON notifications FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
```
**Purpose**: Controls notification updates
- Users can only update their own notifications (e.g., marking as read)
- Double check in USING and WITH CHECK clauses ensures both read and write restrictions

#### Insert Policy
```sql
CREATE POLICY "System can create notifications"
    ON notifications FOR INSERT
    TO authenticated
    WITH CHECK (true);
```
**Purpose**: Allows the notification trigger to create notifications
- Permissive policy for inserts
- Security is enforced through the trigger function running with SECURITY DEFINER

### Automated Notification Creation
The system uses a trigger function `create_mention_notifications()` that:

#### Trigger Function
```sql
CREATE OR REPLACE FUNCTION create_mention_notifications()
RETURNS TRIGGER AS $$
DECLARE
    content_json jsonb;
    mentioned_user_id uuid;
    mentioned_user_role text;
BEGIN
    -- Parse the content JSON
    content_json := CASE 
        WHEN jsonb_typeof(NEW.content::jsonb) = 'string' 
        THEN NEW.content::jsonb::text::jsonb 
        ELSE NEW.content::jsonb 
    END;

    -- Process mentions only if they exist
    IF content_json ? 'mentions' AND jsonb_array_length(content_json->'mentions') > 0 THEN
        FOR mentioned_user_id IN 
            SELECT (mention->>'referenced_id')::uuid
            FROM jsonb_array_elements(content_json->'mentions') as mention
        LOOP
            -- Only create notifications for staff members
            SELECT role INTO mentioned_user_role
            FROM users_secure
            WHERE id = mentioned_user_id;
            
            IF mentioned_user_role IN ('ADMIN', 'AGENT') THEN
                INSERT INTO notifications (user_id, activity_id)
                VALUES (mentioned_user_id, NEW.id);
            END IF;
        END LOOP;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

#### Trigger Definitions
```sql
-- For ticket activities
CREATE TRIGGER on_mention
    AFTER INSERT OR UPDATE OF content ON ticket_activities
    FOR EACH ROW
    WHEN (NEW.activity_type = 'comment')
    EXECUTE FUNCTION create_mention_notifications();
```

**Implementation Details**:
1. Runs with SECURITY DEFINER privileges to bypass RLS
2. Only processes comments (activity_type = 'comment')
3. Handles both INSERT and UPDATE events
4. Creates notifications only for staff members (ADMIN/AGENT)
5. Safely parses JSON content to handle mentions
6. Automatically triggered after comment creation/update

## Security Considerations

### General Principles
1. **Least Privilege**: Users only have access to what they need
2. **Role-Based Access**: Different permissions for staff vs regular users
3. **Data Isolation**: Users can't access other users' private data
4. **Automatic Enforcement**: Policies are enforced at the database level
5. **Security Definer Functions**: Used for complex operations requiring elevated privileges

### Staff Privileges
- Full access to view all tickets
- Can update any ticket (admin/agent)
- Can delete tickets (admin only)
- Can view all activities
- Can add activities to any ticket
- Can see internal notes
- Receive notifications when mentioned

### Regular User Restrictions
- Can only view their created tickets
- Cannot update or delete tickets
- Limited to non-internal activities on their tickets
- Can only manage their own profile
- Can only delete their own activities
- Do not receive notifications when mentioned

## Best Practices
1. Always test RLS policies with different user roles
2. Use EXISTS clauses for better performance
3. Keep policies simple and focused
4. Document policy changes in migrations
5. Use security definer functions for complex operations requiring elevated privileges
6. Implement proper error handling in trigger functions
7. Use explicit table aliases in complex queries
8. Add appropriate indexes for policy performance

## Maintenance
- Review policies when adding new features
- Test policy changes thoroughly
- Keep this documentation updated
- Monitor policy performance
- Review trigger function logs for debugging
- Check policy performance with EXPLAIN ANALYZE 