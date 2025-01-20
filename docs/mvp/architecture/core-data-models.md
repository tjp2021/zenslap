# Core Data Models

## Ticket Schema
```sql
CREATE TABLE tickets (
  ticket_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  status VARCHAR NOT NULL,
  priority VARCHAR NOT NULL,
  creation_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb,
  conversation_history JSONB DEFAULT '[]'::jsonb
);

-- Basic indexes for MVP
CREATE INDEX idx_tickets_status ON tickets(status);
CREATE INDEX idx_tickets_priority ON tickets(priority);
```

## User Schema
```sql
CREATE TABLE users (
  user_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR UNIQUE NOT NULL,
  role VARCHAR NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Basic index for MVP
CREATE INDEX idx_users_role ON users(role);
```

## MVP Constraints
- Limited to essential fields
- Basic indexing only
- JSONB for flexibility 