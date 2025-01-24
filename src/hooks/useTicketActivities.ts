'use client'

import { createClient } from '@/lib/supabase/client'
import useSWR from 'swr'
import { TicketActivity, CreateActivityDTO, Actor, ActivityType, CommentContent, MentionData } from '@/lib/types/activities'
import { useToast } from '@/components/ui/use-toast'
import { useAuth } from '@/hooks/useAuth'
import { useRoleAccess } from '@/hooks/useRoleAccess'

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

      // Debug the query parameters
      console.log('🔍 Query Debug:', {
        isStaff,
        ticketId,
        isAdmin,
        isAgent
      })

      const { data: activities, error: activitiesError } = await query

      // Debug the raw results with focus on roles
      console.log('🔍 Raw Query Results:', {
        activities: activities?.map(a => ({
          id: a.id,
          actor_role: a.actor?.role,  // Get role from actor object
          actor_id: a.actor_id
        })),
        error: activitiesError
      })

      if (activitiesError) throw activitiesError

      // Filter internal notes if not staff
      const filteredActivities = isStaff 
        ? activities 
        : activities?.filter(activity => {
            if (activity.activity_type !== 'comment') return true
            const content = activity.content as CommentContent
            return !content?.is_internal
          })

      // Map activities to include actor role
      const formattedActivities = filteredActivities?.map(activity => ({
        ...activity,
        actor: activity.actor // Keep the original actor object with role
      }))

      return formattedActivities || []
    },
    {
      revalidateOnFocus: false,
      dedupingInterval: 5000
    }
  )

  const addActivity = async (content: string, isInternal: boolean = false, mentions: MentionData[] = []) => {
    if (!user) {
      toast({
        title: 'Error',
        description: 'You must be logged in to add comments',
      })
      return
    }

    // Get emails for all mentioned users
    const { data: mentionedUsers, error: mentionError } = await supabase
      .from('users_secure')
      .select('id, email')
      .in('id', mentions.map(m => m.referenced_id))

    if (mentionError) {
      console.error('Error fetching mentioned users:', mentionError)
    }

    // Create a map of id -> email for quick lookup
    const userEmailMap = new Map(mentionedUsers?.map(u => [u.id, u.email]) || [])

    // Remove mentions from the displayed text
    let parsedContent = content
    mentions.forEach(mention => {
      // Remove the entire @mention from the text
      parsedContent = parsedContent.replace(
        new RegExp(`@${mention.referenced_id}\\s*`, 'g'),
        ''
      ).trim()
    })

    const newActivity: CreateActivityDTO = {
      ticket_id: ticketId,
      actor_id: user.id,
      activity_type: 'comment' as ActivityType,
      content: {
        text: content, // Use original content with mentions
        is_internal: isInternal,
        mentions: mentions.map(mention => ({
          ...mention,
          id: crypto.randomUUID(), // Ensure each mention has a unique ID
          type: 'user' as const
        })),
        raw_content: content,
        parsed_content: parsedContent
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