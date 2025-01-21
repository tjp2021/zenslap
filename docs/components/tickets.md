# Ticket Components

## TicketList

A component that displays a paginated, sortable list of tickets.

### Props
None - Uses internal context for state management

### Usage
```tsx
import { TicketList } from '@/components/tickets/TicketList'

export default function TicketsPage() {
  return <TicketList />
}
```

### Features
- Sortable columns (created_at, updated_at, priority, status, title)
- Status filtering
- Priority filtering
- Search by title
- Real-time updates

## TicketDetails

A component that displays and allows editing of a single ticket.

### Props
```tsx
interface TicketDetailsProps {
  id: string  // Ticket ID
}
```

### Usage
```tsx
import { TicketDetails } from '@/components/tickets/TicketDetails'

export default function TicketPage({ params }: { params: { id: string } }) {
  return <TicketDetails id={params.id} />
}
```

### Features
- Edit ticket details
- Update status
- Update priority
- Delete ticket
- View ticket history
- Real-time updates

## SLAIndicator

A component that displays the SLA status of a ticket.

### Props
```tsx
interface SLAIndicatorProps {
  createdAt: string
  priority: 'low' | 'medium' | 'high'
}
```

### Usage
```tsx
import { SLAIndicator } from '@/components/tickets/SLAIndicator'

<SLAIndicator createdAt={ticket.created_at} priority={ticket.priority} />
```

### Features
- Visual indicator of time elapsed
- Color-coded based on SLA status
- Updates in real-time

## State Management

Ticket components use a shared context for state management:

```tsx
import { useTickets, useTicketOperation } from '@/lib/context/tickets'

// Read ticket data
const { tickets, loading, sort, setSort } = useTickets()

// Modify tickets
const { createTicket, updateTicket, deleteTicket } = useTicketOperation()
``` 