# API Endpoints

## Authentication
```typescript
POST /auth/login
POST /auth/signup
POST /auth/logout
```

## Tickets
```typescript
GET /tickets              // List tickets
POST /tickets            // Create ticket
GET /tickets/:id         // Get ticket
PATCH /tickets/:id       // Update ticket
DELETE /tickets/:id      // Delete ticket
```

## Queue Management
```typescript
GET /queue              // Get queue status
PATCH /queue/:id/status // Update ticket status
```

## Real-time Subscriptions
```typescript
tickets:status_change   // Ticket status updates
queue:updates          // Queue changes
``` 