# Ticket API Documentation

## Endpoints

### List Tickets
`GET /api/tickets`

Retrieves a list of all tickets.

**Response**
```json
{
  "data": [
    {
      "id": string,
      "title": string,
      "status": "open" | "in_progress" | "closed",
      "priority": "low" | "medium" | "high",
      "created_at": string,
      "updated_at": string
    }
  ]
}
```

### Create Ticket
`POST /api/tickets`

Creates a new ticket.

**Request Body**
```json
{
  "title": string,
  "description": string,
  "priority": "low" | "medium" | "high"
}
```

**Response**
```json
{
  "data": {
    "id": string,
    "title": string,
    "description": string,
    "status": "open",
    "priority": "low" | "medium" | "high",
    "created_at": string,
    "updated_at": string
  }
}
```

### Get Ticket
`GET /api/tickets/[id]`

Retrieves a specific ticket by ID.

**Response**
```json
{
  "data": {
    "id": string,
    "title": string,
    "description": string,
    "status": "open" | "in_progress" | "closed",
    "priority": "low" | "medium" | "high",
    "created_at": string,
    "updated_at": string
  }
}
```

### Update Ticket
`PUT /api/tickets/[id]`

Updates a specific ticket.

**Request Body**
```json
{
  "title"?: string,
  "description"?: string,
  "status"?: "open" | "in_progress" | "closed",
  "priority"?: "low" | "medium" | "high"
}
```

**Response**
```json
{
  "data": {
    "id": string,
    "title": string,
    "description": string,
    "status": string,
    "priority": string,
    "created_at": string,
    "updated_at": string
  }
}
```

### Delete Ticket
`DELETE /api/tickets/[id]`

Deletes a specific ticket.

**Response**
```json
{
  "data": {
    "success": true
  }
}
```

## Error Handling

All endpoints return error responses in the following format:

```json
{
  "error": string
}
```

Common HTTP status codes:
- 200: Success
- 201: Created
- 400: Bad Request
- 401: Unauthorized
- 403: Forbidden
- 404: Not Found
- 500: Internal Server Error

## Authentication

All endpoints require authentication. Include the authentication token in the request headers:

```
Authorization: Bearer <token>
``` 