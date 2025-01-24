'use client'

import { useQuery } from '@tanstack/react-query'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '@/types/supabase'
import { format } from 'date-fns'
import { Tag, User, AlertCircle, Clock } from 'lucide-react'
import { useEffect } from 'react'

interface ActivityFeedProps {
  ticketId: string
}

export function ActivityFeed({ ticketId }: ActivityFeedProps) {
  // Only log in development and only once per mount
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 ActivityFeed mounted for ticket:', ticketId)
    }
  }, [ticketId])
  
  const supabase = createClientComponentClient<Database>()

  // Fetch activities with user information
  const { data: activities, isLoading, error } = useQuery({
    queryKey: ['ticket-activities', ticketId],
    queryFn: async () => {
      try {
        if (process.env.NODE_ENV === 'development') {
          console.log('🔍 Fetching activities for ticket:', ticketId)
        }

        const { data, error } = await supabase
          .from('ticket_activities')
          .select(`
            *,
            actor:users_secure!actor_id (
              email
            )
          `)
          .eq('ticket_id', ticketId)
          .not('activity_type', 'eq', 'comment')  // Exclude comments
          .in('activity_type', ['status_change', 'field_change', 'assignment'])  // Only get system activities
          .order('created_at', { ascending: false })

        if (error) {
          throw error
        }

        if (process.env.NODE_ENV === 'development') {
          console.log('🔍 Found activities:', data?.length || 0)
        }

        return data || []
      } catch (err) {
        console.error('Failed to fetch activities:', err)
        throw err
      }
    },
    staleTime: 1000,
    refetchOnWindowFocus: true
  })

  // Debug logging for component state - only in development and only when values change
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 ActivityFeed state:', {
        loading: isLoading,
        error: error ? 'Error occurred' : 'None',
        activityCount: activities?.length || 0
      })
    }
  }, [isLoading, error, activities?.length])

  if (isLoading) {
    return <div className="text-sm text-gray-500">Loading activity history...</div>
  }

  if (error) {
    return <div className="text-sm text-red-500">Error loading activity history</div>
  }

  if (!activities?.length) {
    return <div className="text-sm text-gray-500">No activity history yet</div>
  }

  return (
    <div className="space-y-4">
      {activities.map(activity => {
        // Move debug logging to development only
        if (process.env.NODE_ENV === 'development') {
          console.log('🔍 Rendering activity:', {
            id: activity.id,
            type: activity.activity_type,
            actor: activity.actor?.email
          })
        }
        
        return (
          <div key={activity.id} className="flex items-start gap-3 text-sm">
            {/* Activity Icon */}
            <div className="mt-0.5">
              {activity.activity_type === 'status_change' && (
                <AlertCircle className="h-4 w-4 text-blue-500" />
              )}
              {activity.activity_type === 'field_change' && (
                <Tag className="h-4 w-4 text-yellow-500" />
              )}
              {activity.activity_type === 'assignment' && (
                <User className="h-4 w-4 text-purple-500" />
              )}
            </div>

            {/* Activity Content */}
            <div className="flex-1">
              <p className="text-sm text-gray-900">
                <span className="font-medium">{activity.actor?.email || 'Unknown user'}</span>
                {' '}
                {activity.activity_type === 'status_change' && (
                  <>changed status from <span className="font-medium">{activity.content.from || 'none'}</span> to <span className="font-medium">{activity.content.to}</span></>
                )}
                {activity.activity_type === 'assignment' && (
                  <>
                    {activity.content.to ? (
                      <>assigned ticket to <span className="font-medium">{activity.content.to}</span></>
                    ) : (
                      <>unassigned ticket</>
                    )}
                  </>
                )}
                {activity.activity_type === 'field_change' && (
                  <>
                    changed {activity.content.field} from{' '}
                    <span className="font-medium">{activity.content.from || 'none'}</span> to{' '}
                    <span className="font-medium">{activity.content.to}</span>
                  </>
                )}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {format(new Date(activity.created_at), 'MMM d, yyyy h:mm a')}
              </p>
            </div>
          </div>
        )
      })}
    </div>
  )
}