'use client'

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '@/types/supabase'
import useSWR from 'swr'
import type { TicketActivity } from '@/lib/types/activities'
import { useAuth } from '@/lib/hooks/useAuth'
import { useRoleAccess } from '@/hooks/useRoleAccess'
import { SCHEMA } from '@/lib/constants/schema'

export function useTicketUpdates() {
  console.log('🚀 useTicketUpdates Hook Started')
  const supabase = createClientComponentClient<Database>()
  const { user } = useAuth()
  const { isAdmin, isAgent } = useRoleAccess()
  const isStaff = isAdmin || isAgent
  
  console.log('👤 Auth State:', { 
    userId: user?.id,
    isAdmin,
    isAgent,
    isStaff
  })

  const { data, error, mutate } = useSWR(
    user?.id ? ['ticket-updates', user.id, isAdmin, isAgent] : null,
    async () => {
      console.log('📡 Starting Data Fetch', {
        timestamp: new Date().toISOString(),
        userId: user?.id,
        roles: { isAdmin, isAgent }
      })
      
      console.log('🔍 Building Query...')
      let query = supabase
        .from('ticket_activities')
        .select(`
          id,
          activity_type,
          content,
          created_at,
          ticket:${SCHEMA.RELATIONSHIPS.TICKET_ACTIVITIES.TICKET.path} (
            ${SCHEMA.RELATIONSHIPS.TICKET_ACTIVITIES.TICKET.fields.id},
            ${SCHEMA.RELATIONSHIPS.TICKET_ACTIVITIES.TICKET.fields.title},
            ${SCHEMA.RELATIONSHIPS.TICKET_ACTIVITIES.TICKET.fields.created_by},
            ${SCHEMA.RELATIONSHIPS.TICKET_ACTIVITIES.TICKET.fields.assignee}
          ),
          actor:${SCHEMA.RELATIONSHIPS.TICKET_ACTIVITIES.ACTOR.path} (
            ${SCHEMA.RELATIONSHIPS.TICKET_ACTIVITIES.ACTOR.fields.id},
            ${SCHEMA.RELATIONSHIPS.TICKET_ACTIVITIES.ACTOR.fields.email},
            ${SCHEMA.RELATIONSHIPS.TICKET_ACTIVITIES.ACTOR.fields.role}
          )
        `)
        .order('created_at', { ascending: false })
        .limit(50)

      // Regular users only see their own tickets
      if (!isStaff && user?.id) {
        console.log('🎯 Applying Regular User Filter:', user.id)
        query = query.eq(`${SCHEMA.RELATIONSHIPS.TICKET_ACTIVITIES.TICKET.path}.${SCHEMA.RELATIONSHIPS.TICKET_ACTIVITIES.TICKET.fields.created_by}`, user.id)
      }
      // For agents, only show tickets they're assigned to
      else if (isAgent && !isAdmin && user?.id) {
        console.log('🎯 Applying Agent Filter:', user.id)
        query = query.eq(`${SCHEMA.RELATIONSHIPS.TICKET_ACTIVITIES.TICKET.path}.${SCHEMA.RELATIONSHIPS.TICKET_ACTIVITIES.TICKET.fields.assignee}`, user.id)
      }

      console.log('⚡ Executing Query with config:', {
        isStaff,
        isAgent,
        isAdmin,
        userId: user?.id
      })

      const { data: activityData, error } = await query
      
      if (error) {
        console.error('❌ Query Error:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        })
        throw error
      }

      console.log('✅ Query Successful')
      console.log('📊 Raw Data Sample:', {
        count: activityData?.length,
        firstItem: activityData?.[0],
        tables: activityData?.[0] ? Object.keys(activityData[0]) : []
      })

      // Transform the data to match expected format
      console.log('🔄 Starting Data Transform')
      const activities = activityData?.map(activity => {
        console.log('🔍 Processing Activity:', {
          id: activity.id,
          type: activity.activity_type,
          hasTicket: !!activity.ticket,
          hasUser: !!activity.actor
        })
        return {
          ...activity,
          ticket: activity.ticket,
          actor: activity.actor
        }
      }) || []

      console.log('✨ Transform Complete:', {
        totalActivities: activities.length,
        sample: activities[0]
      })

      return { activities }
    },
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 60000
    }
  )

  console.log('🔄 Hook State:', {
    hasData: !!data,
    hasError: !!error,
    activitiesCount: data?.activities?.length
  })

  return {
    activities: data?.activities || [],
    isLoading: !error && !data,
    error,
    mutate
  }
} 