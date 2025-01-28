import { useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import useSWR, { mutate } from 'swr'
import { useAuth } from '@/lib/hooks/useAuth'
import { NotificationWithDetails } from '@/lib/types/notifications'
import { NotificationAIService } from '@/lib/services/notification-ai.service'

export function useNotifications() {
  const supabase = createClientComponentClient()
  const { user } = useAuth()
  const notificationAI = NotificationAIService.getInstance()

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

      // Process notifications with AI if they don't have analysis yet
      const processedNotifications = await Promise.all(
        (data || []).map(async (notification: NotificationWithDetails) => {
          if (!notification.priority || !notification.ai_metadata) {
            try {
              const analysis = await notificationAI.analyzeNotification(notification)
              return {
                ...notification,
                priority: analysis.priority,
                confidence: analysis.confidence,
                ai_metadata: analysis.metadata
              }
            } catch (error) {
              console.error('Failed to analyze notification:', error)
              return notification
            }
          }
          return notification
        })
      )

      return processedNotifications || []
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
              const analysis = await notificationAI.analyzeNotification(notification)
              
              // Update the notification with AI analysis
              await supabase
                .from('notifications')
                .update({
                  priority: analysis.priority,
                  confidence: analysis.confidence,
                  ai_metadata: analysis.metadata
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
  }, [user, mutate, supabase, notificationAI])

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