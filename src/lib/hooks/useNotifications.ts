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
      .channel(`notifications:${user.id}`) // Unique channel per user
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('🔄 Real-time notification update:', payload)
          // Force immediate refetch without caching
          mutate(undefined, { revalidate: true })
        }
      )
      .subscribe()

    console.log('🔌 Subscribed to notification changes for user:', user.id)

    return () => {
      console.log('❌ Unsubscribed from notification changes')
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

    console.log('🔄 Marking these notifications as read:', notifications.map(n => n.id))

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

  return {
    notifications,
    unreadCount: notifications.length > 0 ? 1 : 0,
    isLoading: !error && !notifications,
    error,
    markAllAsRead,
    markAsRead
  }
} 