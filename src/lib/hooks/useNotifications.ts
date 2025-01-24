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

    const subscription = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          // Invalidate and refetch
          mutate()
        }
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
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
    if (!user) return

    // Optimistically update cache
    mutate([], false)

    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', user.id)
      .eq('read', false)

    if (error) {
      // If error, revalidate to get real state
      mutate()
      throw error
    }
  }

  return {
    notifications,
    unreadCount: notifications.length > 0 ? 1 : 0,
    isLoading: !error && !notifications,
    error,
    markAllAsRead,
    markAsRead
  }
} 