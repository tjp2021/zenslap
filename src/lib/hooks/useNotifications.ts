'use client'

import { useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import useSWR, { mutate } from 'swr'
import { useAuth } from '@/lib/hooks/useAuth'
import { NotificationWithDetails } from '@/lib/types/notifications'

export function useNotifications() {
  const supabase = createClientComponentClient()
  const { user } = useAuth()

  // Fetch only unread notifications
  const { data: notifications = [], error, mutate } = useSWR(
    user ? ['notifications', user.id] : null,
    async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select(`
          *,
          activity:ticket_activities!notifications_activity_id_fkey (
            id,
            ticket_id,
            activity_type,
            content,
            created_at,
            ticket:tickets!ticket_activities_ticket_id_fkey (
              id,
              title
            )
          )
        `)
        .eq('user_id', user!.id)
        .eq('read', false)
        .order('created_at', { ascending: false })

      if (error) throw error

      return data || []
    },
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      dedupingInterval: 5000 // 5 seconds
    }
  )

  // Real-time subscription
  useEffect(() => {
    if (!user) return

    const channel = supabase
      .channel(`notifications:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        async (payload) => {
          console.log('🔄 Real-time notification update:', payload)
          
          // If this is a new notification, analyze it
          if (payload.eventType === 'INSERT') {
            try {
              const notification = payload.new as NotificationWithDetails
              const analysis = await fetch('/api/notifications/analyze', {
                method: 'POST',
                body: JSON.stringify({ notification }),
                headers: {
                  'Content-Type': 'application/json'
                }
              })
              const data = await analysis.json()
              
              // Update the notification with AI analysis
              await supabase
                .from('notifications')
                .update({
                  priority: data.priority,
                  confidence: data.confidence,
                  ai_metadata: data.metadata
                })
                .eq('id', notification.id)
            } catch (error) {
              console.error('Failed to analyze new notification:', error)
            }
          }
          
          // Force immediate refetch without caching
          mutate(undefined, { revalidate: true })
        }
      )
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [user, mutate, supabase])

  // Mark individual notification as read
  const markAsRead = async (notificationId: string) => {
    if (!user) return

    // Optimistically update cache
    mutate(
      notifications.filter(n => n.id !== notificationId),
      false
    )

    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', notificationId)
      .eq('user_id', user.id)

    if (error) {
      // If error, revalidate to get real state
      mutate()
      throw error
    }
  }

  // Mark all as read
  const markAllAsRead = async () => {
    if (!user || !notifications.length) return

    // Use direct UPDATE instead of RPC
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .in('id', notifications.map(n => n.id))
      .eq('user_id', user.id)

    if (error) {
      console.error('Failed to mark notifications as read:', error)
      throw error
    }

    // Force immediate refetch without caching
    await mutate(undefined, { revalidate: true })
  }

  // Get high priority notifications
  const highPriorityNotifications = notifications.filter(
    n => n.priority === 'high' && n.confidence > 0.7
  )

  return {
    notifications,
    highPriorityNotifications,
    unreadCount: notifications.length,
    highPriorityCount: highPriorityNotifications.length,
    isLoading: !error && !notifications,
    error,
    markAllAsRead,
    markAsRead
  }
} 