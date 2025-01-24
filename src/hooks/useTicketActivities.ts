'use client'

import { createClient } from '@/lib/supabase/client'
import useSWR from 'swr'
import { TicketActivity, CreateActivityDTO, Actor, ActivityType, CommentContent, MentionData } from '@/lib/types/activities'
import { useToast } from '@/components/ui/use-toast'
import { useAuth } from '@/hooks/useAuth'
import { useRoleAccess } from '@/hooks/useRoleAccess'
import { createActivitySchema } from '@/lib/validation'

export function useTicketActivities(ticketId: string) {
  const supabase = createClient()
  const { toast } = useToast()
  const { user } = useAuth()
  const { isAdmin, isAgent } = useRoleAccess()
  const isStaff = isAdmin || isAgent

  const {
    data: activities = [],
    error,
    isLoading,
    mutate
  } = useSWR<TicketActivity[]>(
    user && ticketId ? `ticket-activities-${ticketId}` : null,
    async () => {
      console.log('🔍 [useTicketActivities] Starting fetch with:', {
        user,
        ticketId,
        isStaff,
        timestamp: new Date().toISOString(),
        swr_key: `ticket-activities-${ticketId}`
      })

      if (!user || !ticketId) {
        console.log('❌ [useTicketActivities] Missing user or ticketId:', { user, ticketId })
        return []
      }

      // First get the activities - no JSON filtering in query
      const query = supabase
        .from('ticket_activities')
        .select(`
          *,
          actor:users_secure(
            id,
            email,
            role
          )
        `)
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: false })

      console.log('🔍 [useTicketActivities] Executing query for:', {
        ticketId,
        isStaff,
        user_id: user.id,
        query_details: query.toString()
      })

      const { data: activities, error: activitiesError } = await query

      console.log('🔍 [useTicketActivities] Raw query results:', {
        hasData: !!activities,
        dataLength: activities?.length,
        firstActivity: activities?.[0],
        error: activitiesError,
        timestamp: new Date().toISOString()
      })

      if (activitiesError) {
        console.error('❌ [useTicketActivities] Query error:', activitiesError)
        throw activitiesError
      }

      // Filter internal notes if not staff
      const filteredActivities = isStaff 
        ? activities 
        : activities?.filter(activity => {
            if (activity.activity_type !== 'comment') return true
            const content = activity.content as CommentContent
            return !content?.is_internal
          })

      console.log('🔍 [useTicketActivities] After filtering:', {
        originalLength: activities?.length,
        filteredLength: filteredActivities?.length,
        isStaff,
        removedCount: (activities?.length || 0) - (filteredActivities?.length || 0)
      })

      // Map activities to include actor role
      const formattedActivities = filteredActivities?.map(activity => ({
        ...activity,
        actor: activity.actor
      }))

      console.log('🔍 [useTicketActivities] Final formatted activities:', {
        length: formattedActivities?.length,
        firstFewActivities: formattedActivities?.slice(0, 2).map(a => ({
          id: a.id,
          type: a.activity_type,
          actorId: a.actor?.id,
          actorRole: a.actor?.role
        }))
      })

      return formattedActivities || []
    },
    {
      revalidateOnFocus: false,
      dedupingInterval: 5000
    }
  )

  const addActivity = async (content: string, isInternal: boolean, mentions: MentionData[] = []) => {
    console.log('🔍 [useTicketActivities] Adding activity:', {
      content,
      isInternal,
      mentions,
      timestamp: new Date().toISOString()
    });

    if (!user) {
      toast({
        title: 'Error',
        description: 'You must be logged in to add comments',
      })
      return
    }

    // Get emails for all mentioned users for UI display
    const { data: mentionedUsers, error: mentionError } = await supabase
      .from('users_secure')
      .select('id, email, role')
      .in('id', mentions.map(m => m.referenced_id))

    console.log('🔍 [useTicketActivities] Mentioned users query:', {
      users: mentionedUsers,
      error: mentionError,
      timestamp: new Date().toISOString()
    });

    if (mentionError) {
      console.error('Error fetching mentioned users:', mentionError)
    }

    try {
      const newActivity = {
        ticket_id: ticketId,
        actor_id: user.id,
        activity_type: 'comment' as const,
        content: {
          text: content,
          is_internal: isInternal
        },
        mentioned_user_ids: mentions.map(m => m.referenced_id)
      }
      
      console.log('🔍 [useTicketActivities] Creating activity:', {
        activity: newActivity,
        timestamp: new Date().toISOString()
      });
      
      const { data: activity, error } = await supabase
        .from('ticket_activities')
        .insert(newActivity)
        .select()
        .single()

      console.log('🔍 [useTicketActivities] Activity creation result:', {
        activity,
        error,
        timestamp: new Date().toISOString()
      });

      if (error) {
        console.error('Error adding activity:', error)
        throw error
      }

      // Get the actor data
      const { data: actor, error: actorError } = await supabase
        .from('users_secure')
        .select('id, email, role')
        .eq('id', user.id)
        .single()

      if (actorError) throw actorError

      // Update UI
      const fullActivity = {
        ...activity,
        actor: actor || {
          id: user.id,
          email: 'unknown',
          role: 'unknown'
        }
      }

      await mutate(prev => [fullActivity, ...(prev || [])])

      toast({
        title: 'Success',
        description: 'Comment added successfully',
      })
    } catch (error) {
      console.error('Error adding activity:', error)
      toast({
        title: 'Error',
        description: 'Failed to add comment',
      })
    }
  }

  const deleteActivity = async (activityId: string) => {
    if (!user) {
      toast({
        title: 'Error',
        description: 'You must be logged in to delete comments',
      })
      return
    }

    try {
      const { error } = await supabase
        .from('ticket_activities')
        .delete()
        .eq('id', activityId)

      if (error) throw error

      // Optimistically update the UI
      await mutate(prev => prev?.filter(a => a.id !== activityId))

      toast({
        title: 'Success',
        description: 'Comment deleted successfully',
      })
    } catch (error) {
      console.error('Error deleting activity:', error)
      toast({
        title: 'Error',
        description: 'Failed to delete comment',
      })
    }
  }

  return {
    activities,
    isLoading,
    error,
    addActivity,
    deleteActivity,
  }
} 