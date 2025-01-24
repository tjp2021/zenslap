import { useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import useSWR, { mutate } from 'swr'
import { useAuth } from '@/lib/hooks/useAuth'
import { NotificationWithDetails } from '@/lib/types/notifications'

export function useNotifications() {
  const supabase = createClientComponentClient()
  const { user } = useAuth()

  // Fetch notifications
  const { data: notifications = [], error, mutate } = useSWR(
    user ? ['notifications', user.id] : null,
    async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select(`
          *,
          activity:ticket_activities (
            id,
            ticket_id,
            type,
            content,
            created_at
          ),
          ticket:tickets!ticket_activities(id, title)
        `)
        .eq('user_id', user!.id)
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

  // Mark notification as read
  const markAsRead = async (notificationId: string) => {
    if (!user) return

    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', notificationId)
      .eq('user_id', user.id)

    if (error) throw error

    // Optimistically update cache
    mutate(
      (old: NotificationWithDetails[] | undefined) => 
        old?.map(n => n.id === notificationId ? { ...n, read: true } : n) || [],
      false // Don't revalidate immediately
    )
  }

  // Mark all as read
  const markAllAsRead = async () => {
    if (!user) return

    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', user.id)
      .eq('read', false)

    if (error) throw error

    // Optimistically update cache
    mutate(
      (old: NotificationWithDetails[] | undefined) => 
        old?.map(n => ({ ...n, read: true })) || [],
      false // Don't revalidate immediately  
    )
  }

  const unreadCount = (notifications || []).filter(n => !n.read).length

  return {
    notifications: notifications || [],
    unreadCount,
    isLoading: !error && !notifications,
    error,
    markAsRead,
    markAllAsRead
  }
} 