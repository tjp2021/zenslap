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
  console.log(`
🔍🔍🔍🔍🔍🔍🔍🔍🔍🔍🔍🔍🔍🔍🔍🔍🔍🔍🔍🔍🔍🔍🔍🔍🔍🔍🔍🔍🔍🔍🔍🔍
                     ACTIVITY FEED DEBUG INFO
🔍🔍🔍🔍🔍🔍🔍🔍🔍🔍🔍🔍🔍🔍🔍🔍🔍🔍🔍🔍🔍🔍🔍🔍🔍🔍🔍🔍🔍🔍🔍🔍
TicketID: ${ticketId}
  `)
  
  const supabase = createClientComponentClient<Database>()

  // Fetch activities with user information
  const { data: activities, isLoading, error } = useQuery({
    queryKey: ['ticket-activities', ticketId],
    queryFn: async () => {
      try {
        console.log(`
╔═══════════════════════════════════════════════════════╗
║                FETCHING ACTIVITIES                     ║
╚═══════════════════════════════════════════════════════╝
Ticket ID: ${ticketId}
        `)

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
          console.error(`
🚨 QUERY ERROR 🚨
${JSON.stringify(error, null, 2)}
          `)
          throw error
        }

        console.log(`
✨ QUERY SUCCESS ✨
Found ${data?.length || 0} activities
${JSON.stringify(data, null, 2)}
        `)

        return data || []
      } catch (err) {
        console.error(`
❌ UNEXPECTED ERROR ❌
${err instanceof Error ? err.message : JSON.stringify(err)}
        `)
        throw err
      }
    },
    staleTime: 1000, // Consider data fresh for 1 second
    refetchOnWindowFocus: true // Refetch when window regains focus
  })

  // Debug logging for component state
  useEffect(() => {
    console.log(`
⚡️ ACTIVITY FEED STATE CHANGED ⚡️
Loading: ${isLoading}
Error: ${error ? JSON.stringify(error) : 'None'}
Activities: ${activities?.length || 0}
    `)
  }, [isLoading, error, activities])

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
      {activities.map((activity) => {
        console.log(`
📝 RENDERING ACTIVITY:
ID: ${activity.id}
Type: ${activity.activity_type}
Actor: ${activity.actor?.email}
Content: ${JSON.stringify(activity.content, null, 2)}
      `)
        
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