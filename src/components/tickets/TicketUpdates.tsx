'use client'

import { useTicketUpdates } from '@/hooks/useTicketUpdates'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDistanceToNow } from 'date-fns'
import { useAuth } from '@/lib/hooks/useAuth'
import { ACTIVITY_TYPES } from '@/lib/types/activities'

export function TicketUpdates() {
  const { user } = useAuth()
  const { activities, loading, error } = useTicketUpdates(user?.id || '')

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

  if (!activities || activities.length === 0) {
    return (
      <div className="text-sm text-muted-foreground p-4">
        No recent updates
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {activities.map((activity) => (
        <div key={activity.id} className="p-3 border rounded-lg">
          <p className="text-sm">
            <span className="font-medium">
              {activity.activity_type === ACTIVITY_TYPES.ASSIGNMENT ? 'Assignment' :
               activity.activity_type === ACTIVITY_TYPES.STATUS_CHANGE ? 'Status Update' :
               activity.activity_type === ACTIVITY_TYPES.FIELD_CHANGE ? 'Field Update' :
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