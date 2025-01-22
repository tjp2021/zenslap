import { useTicketUpdates } from '@/hooks/useTicketUpdates'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDistanceToNow } from 'date-fns'

export function TicketUpdates() {
  const { updates, loading, error } = useTicketUpdates()

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="p-3 border rounded-lg">
            <Skeleton className="h-4 w-3/4 mb-2" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-sm text-red-500 p-4">
        Failed to load updates
      </div>
    )
  }

  if (updates.length === 0) {
    return (
      <div className="text-sm text-muted-foreground p-4">
        No recent updates
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {updates.map((activity) => (
        <div key={activity.id} className="p-3 border rounded-lg">
          <p className="text-sm">
            <span className="font-medium">
              {activity.activity_type === 'assignment' ? 'Assignment' :
               activity.activity_type === 'status_change' ? 'Status Update' :
               activity.activity_type === 'field_change' ? 'Field Update' :
               'Comment'}
            </span>
            {' '}on ticket #{activity.ticket_id.slice(0, 8)}
          </p>
          <p className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(activity.created_at))} ago
          </p>
        </div>
      ))}
    </div>
  )
} 