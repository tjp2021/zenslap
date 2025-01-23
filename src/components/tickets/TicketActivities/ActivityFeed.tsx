'use client'

import { useQuery } from '@tanstack/react-query'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '@/types/supabase'
import { format } from 'date-fns'
import { Tag, User, AlertCircle, Clock } from 'lucide-react'

interface ActivityFeedProps {
  ticketId: string
}

export function ActivityFeed({ ticketId }: ActivityFeedProps) {
  const supabase = createClientComponentClient<Database>()

  // Fetch only system activities (no comments/notes)
  const { data: activities, isLoading } = useQuery({
    queryKey: ['ticket-activities', ticketId, 'system'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ticket_activities')
        .select('*')
        .eq('ticket_id', ticketId)
        .in('activity_type', ['status_change', 'field_change', 'assignment', 'tag_change'])
        .order('created_at', { ascending: false })

      if (error) throw error
      return data || []
    }
  })

  if (isLoading) {
    return <div className="text-sm text-gray-500">Loading activity history...</div>
  }

  if (!activities?.length) {
    return <div className="text-sm text-gray-500">No activity history yet</div>
  }

  return (
    <div className="space-y-4">
      {activities.map((activity) => (
        <div key={activity.id} className="flex items-start gap-3 text-sm">
          {/* Activity Icon */}
          <div className="mt-0.5">
            {activity.activity_type === 'status_change' && (
              <AlertCircle className="h-4 w-4 text-blue-500" />
            )}
            {activity.activity_type === 'field_change' && (
              <AlertCircle className="h-4 w-4 text-yellow-500" />
            )}
            {activity.activity_type === 'assignment' && (
              <User className="h-4 w-4 text-purple-500" />
            )}
            {activity.activity_type === 'tag_change' && (
              <Tag className="h-4 w-4 text-green-500" />
            )}
          </div>

          {/* Activity Content */}
          <div className="flex-1">
            <p className="text-gray-700">
              {activity.activity_type === 'status_change' && (
                <>Status changed from {activity.content.from} to {activity.content.to}</>
              )}
              {activity.activity_type === 'field_change' && (
                <>{activity.content.field} changed from {activity.content.from} to {activity.content.to}</>
              )}
              {activity.activity_type === 'assignment' && (
                <>
                  {activity.content.from 
                    ? `Reassigned from ${activity.content.from} to ${activity.content.to || 'unassigned'}`
                    : `Assigned to ${activity.content.to}`
                  }
                </>
              )}
              {activity.activity_type === 'tag_change' && (
                <>
                  {activity.content.action === 'add' 
                    ? `Added tag "${activity.content.tag}"`
                    : `Removed tag "${activity.content.tag}"`
                  }
                </>
              )}
            </p>
            <span className="text-xs text-gray-500">
              {format(new Date(activity.created_at), 'MMM d, yyyy h:mm a')}
            </span>
          </div>
        </div>
      ))}
    </div>
  )
} 