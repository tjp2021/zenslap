'use client'

import { createClient } from '@/lib/supabase/client'
import useSWR from 'swr'
import { TicketActivity, CreateActivityDTO } from '@/lib/types'
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
        actor: actors?.find(actor => actor.id === activity.actor_id)
      })) || []
    },
    {
      revalidateOnFocus: false,
      dedupingInterval: 5000
    }
  )

  const addActivity = async (content: string, isInternal: boolean) => {
    if (!user) {
      toast({
        title: 'Error',
        description: 'You must be logged in to add comments',
        variant: 'destructive',
      })
      return
    }

    try {
      const newActivity = {
        ticket_id: ticketId,
        actor_id: user.id,
        activity_type: 'comment' as const,
        content: {
          message: content,
          is_internal: isInternal,
        },
      }

      // First insert the activity
      const { data: activity, error: insertError } = await supabase
        .from('ticket_activities')
        .insert([newActivity])
        .select()
        .single()

      if (insertError) throw insertError

      // Then get the actor data
      const { data: actor, error: actorError } = await supabase
        .from('users_secure')
        .select('id, email, role')
        .eq('id', user.id)
        .single()

      if (actorError) throw actorError

      // Combine the data
      const fullActivity = {
        ...activity,
        actor,
        content: newActivity.content
      }
      
      await mutate([fullActivity, ...activities], false)
      toast({
        title: 'Success',
        description: 'Comment added successfully',
      })
    } catch (error) {
      console.error('Error adding activity:', error)
      toast({
        title: 'Error',
        description: 'Failed to add comment',
        variant: 'destructive',
      })
      throw error
    }
  }

  const deleteActivity = async (activityId: string) => {
    if (!user) {
      toast({
        title: 'Error',
        description: 'You must be logged in to delete comments',
        variant: 'destructive',
      })
      return
    }

    try {
      const { error } = await supabase
        .from('ticket_activities')
        .delete()
        .eq('id', activityId)

      if (error) throw error
      
      await mutate(
        activities.filter((activity) => activity.id !== activityId),
        false
      )
      toast({
        title: 'Success',
        description: 'Activity deleted successfully',
      })
    } catch (error) {
      console.error('Error deleting activity:', error)
      toast({
        title: 'Error',
        description: 'Failed to delete activity',
        variant: 'destructive',
      })
      throw error
    }
  }

  return {
    activities,
    error,
    isLoading,
    addActivity,
    deleteActivity,
  }
} 