'use client'

import { createClient } from '@/lib/supabase/client'
import useSWR from 'swr'
import { TicketActivity, CreateActivityDTO, Actor, ActivityType, CommentContent } from '@/lib/types/activities'
import { useToast } from '@/components/ui/use-toast'
import { useAuth } from '@/hooks/useAuth'

export function useTicketActivities(ticketId: string) {
  const supabase = createClient()
  const { toast } = useToast()
  const { user } = useAuth()

  const {
    data: activities = [],
    error,
    isLoading,
    mutate
  } = useSWR<TicketActivity[]>(
    user && ticketId ? `ticket-activities-${ticketId}` : null,
    async () => {
      // First get the activities
      const { data: activities, error: activitiesError } = await supabase
        .from('ticket_activities')
        .select('*')
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: false })

      if (activitiesError) throw activitiesError
      
      // Then get the user data for each unique actor_id
      const actorIds = [...new Set(activities?.map(a => a.actor_id) || [])]
      const { data: actors, error: actorsError } = await supabase
        .from('users_secure')
        .select('id, email, role')
        .in('id', actorIds)

      if (actorsError) throw actorsError

      // Combine the data
      return activities?.map(activity => ({
        ...activity,
        actor: actors?.find(actor => actor.id === activity.actor_id) || {
          id: activity.actor_id,
          email: 'unknown',
          role: 'unknown'
        }
      })) || []
    },
    {
      revalidateOnFocus: false,
      dedupingInterval: 5000
    }
  )

  const addActivity = async (content: string, isInternal: boolean = false) => {
    if (!user) {
      toast({
        title: 'Error',
        description: 'You must be logged in to add comments',
      })
      return
    }

    const newActivity: CreateActivityDTO = {
      ticket_id: ticketId,
      activity_type: 'comment' as ActivityType,
      content: {
        text: content,
        is_internal: isInternal,
      } as CommentContent,
    }

    try {
      const { data: activity, error } = await supabase
        .from('ticket_activities')
        .insert(newActivity)
        .select()
        .single()

      if (error) throw error

      // Get the actor data
      const { data: actor, error: actorError } = await supabase
        .from('users_secure')
        .select('id, email, role')
        .eq('id', user.id)
        .single()

      if (actorError) throw actorError

      // Optimistically update the UI
      const fullActivity: TicketActivity = {
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