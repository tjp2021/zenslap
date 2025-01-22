# Supabase Client Usage Documentation

## Client Types and Creation

### 1. Server-Side Clients

```typescript
// API Route Handlers
import { createApiClient } from '@/lib/supabase/server'
const supabase = createApiClient()

// Server Components
import { createServerClient } from '@/lib/supabase/server'
const supabase = createServerClient()

// Context-Aware (Server Actions)
import { createContextAwareClient } from '@/lib/supabase/server'
const supabase = await createContextAwareClient()
```

### 2. Client-Side Components

```typescript
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
const supabase = createClientComponentClient<Database>()
```

## Authentication Implementation

### 1. Auth Flow

- **Login Page**: `/auth/login`
  - Uses `AuthUI` component with Supabase Auth UI
  - Redirects to `/auth/callback` after successful authentication

- **Callback Handler**: `/auth/callback`
  - Handles OAuth redirects and session establishment
  - Redirects to `/tickets` after successful authentication

- **Sign Out**: Implemented in `SignOutButton` component
  - Calls `supabase.auth.signOut()`
  - Redirects to `/auth/login`

### 2. Session Management

- **Middleware** (`middleware.ts`)
  - Refreshes session on each request
  - Applies to all routes except static assets

- **Auth Hook** (`useAuth.ts`)
  - Provides user state and loading status
  - Handles auth state changes
  - Used in client components for auth-aware rendering

## Data Access Patterns

### 1. Tickets Context (`tickets.tsx`)

```typescript
// Fetch tickets
const { data, error } = await supabase
  .from('tickets')
  .select('*')
  .order('created_at', { ascending: false })

// Create ticket
const { error } = await supabase
  .from('tickets')
  .insert([{
    ...data,
    status: data.status || 'open',
    priority: data.priority || 'medium',
    metadata: data.metadata || {}
  }])

// Update ticket
const { error } = await supabase
  .from('tickets')
  .update(data)
  .eq('id', data.id)

// Delete ticket
const { error } = await supabase
  .from('tickets')
  .delete()
  .eq('id', id)
```

### 2. Tags Management (`useTags.ts`)

```typescript
// Fetch tags
const { data, error } = await supabase
  .from('tags')
  .select('*')
  .order('name', { ascending: true })

// Add tag
const { data, error } = await supabase
  .from('tags')
  .insert([{ name }])
  .select()
  .single()

// Remove tag
const { error } = await supabase
  .from('tags')
  .delete()
  .eq('id', id)
```

## Security Considerations

1. **Client Creation**
   - Server-side clients use appropriate helpers based on context
   - Client-side components use `createClientComponentClient`
   - Middleware refreshes session tokens automatically

2. **Row Level Security (RLS)**
   - All database access should be through RLS policies
   - Authenticated users can only access their authorized data
   - API routes validate session before processing requests

3. **API Protection**
   - `protectApiRoute` wrapper ensures authenticated access
   - Returns appropriate error responses for unauthorized requests

## Best Practices

1. **Client Creation**
   - Use the appropriate client for the context (server vs client)
   - Avoid mixing client types
   - Initialize clients at the highest necessary level

2. **Error Handling**
   - Always check for errors in Supabase responses
   - Provide appropriate error feedback to users
   - Log errors for debugging

3. **Type Safety**
   - Use the `Database` type for type-safe queries
   - Define proper interfaces for data structures
   - Validate data before sending to Supabase

4. **Session Management**
   - Use the auth hooks for client-side auth state
   - Implement proper session refresh in middleware
   - Handle auth state changes appropriately

## Testing

1. **Mock Implementation**
   - Mock Supabase client in tests
   - Provide test data through mocked responses
   - Test error scenarios

2. **Auth Testing**
   - Test authenticated and unauthenticated states
   - Verify proper redirect behavior
   - Test session refresh scenarios

## Common Issues and Solutions

1. **Authentication Issues**
   - Ensure proper session refresh in middleware
   - Check for expired tokens
   - Verify redirect URLs in auth configuration

2. **Data Access Issues**
   - Verify RLS policies
   - Check for proper error handling
   - Ensure proper table permissions

3. **Type Issues**
   - Update Database type definitions when schema changes
   - Use proper type assertions where necessary
   - Keep type definitions in sync with database schema 