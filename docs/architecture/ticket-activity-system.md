# Ticket Activity System - Architecture & Implementation Plan

## Overview
A unified approach to handling all ticket-related activities (comments, status changes, field updates) using a hybrid SQL/JSONB structure.

## Current MVP Status
- Basic ticket CRUD operations ✅
- Status and priority management ✅
- Simple field change history ✅

## Why Change?
1. Current implementation lacks:
   - User-agent conversations
   - Comment threading
   - Rich interaction history
2. Future requirements:
   - @mentions
   - Rich text
   - File attachments
   - Internal notes

## Architecture Decision

### Database Structure
```sql
create table ticket_activities (
    id uuid primary key default uuid_generate_v4(),
    ticket_id uuid not null references tickets(id) on delete cascade,
    actor_id text not null,
    activity_type text not null check (
        activity_type in ('comment', 'note', 'status_change', 'field_change')
    ),
    is_internal boolean default false,
    parent_id uuid references ticket_activities(id),
    content jsonb not null,
    created_at timestamptz not null default now()
);

-- Essential indexes only
create index ticket_activities_ticket_id_created_at_idx 
    on ticket_activities(ticket_id, created_at desc);
```

### Initial Activity Types
1. `comment`: Basic text comments
   ```json
   {
     "message": "string",
     "format": "text"
   }
   ```
2. `note`: Internal notes
   ```json
   {
     "message": "string",
     "format": "text"
   }
   ```
3. `status_change`: Status updates
   ```json
   {
     "from": "string",
     "to": "string"
   }
   ```
4. `field_change`: Other field updates
   ```json
   {
     "field": "string",
     "from": "string",
     "to": "string"
   }
   ```

## Implementation Phases

### Phase 1: Foundation (MVP Extension)
1. Create ticket_activities table
2. Basic API endpoints:
   - GET /api/tickets/:id/activities
   - POST /api/tickets/:id/comments
3. Simple comment UI in ticket details
4. Migrate existing field history

### Phase 2: Enhanced Features
1. Internal notes
2. Comment threading
3. Rich text support
4. Activity timeline UI

### Phase 3: Advanced Features (Post-MVP)
1. @mentions
2. File attachments
3. Activity search
4. Advanced filtering

## Implementation Guidelines

### Performance
- Start without complex indexes
- Monitor query performance
- Add indexes based on actual usage patterns
- Implement caching only when needed

### Data Validation
```typescript
// Basic content validation
const activitySchemas = {
  comment: z.object({
    message: z.string(),
    format: z.enum(['text']),
  }),
  status_change: z.object({
    from: z.string(),
    to: z.string(),
  })
};
```

### UI Components
1. Activity Timeline
   - Chronological list
   - Type-based rendering
   - Simple pagination
2. Comment Form
   - Basic text input
   - Submit button
   - Loading state

## Success Metrics
1. All ticket interactions in one place
2. No performance degradation
3. Easy to understand activity history
4. Foundation for future features

## Risks & Mitigations

### Performance
- Risk: JSONB query performance
- Mitigation: Start simple, optimize based on real usage

### Complexity
- Risk: Over-complicated data structure
- Mitigation: Start with minimal activity types

### Data Integrity
- Risk: Invalid JSONB content
- Mitigation: Strong validation schemas

## Next Steps
1. Create migration for ticket_activities
2. Update API layer for basic comments
3. Add simple comment UI to ticket details
4. Migrate existing history data

## Future Considerations
- Audit logging
- Activity analytics
- Notification system
- AI integration points

Remember:
- Start simple
- Add complexity only when needed
- Monitor and measure before optimizing
- Document all decisions 