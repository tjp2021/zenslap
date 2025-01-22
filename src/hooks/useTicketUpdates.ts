import useSWR from 'swr'
import { useAuth } from '@/hooks/useAuth'
import { ticketService } from '@/lib/api/routes/tickets'
import type { TicketActivity } from '@/lib/types/activities'

const CACHE_KEY = 'ticket-updates'

export function useTicketUpdates() {
  const { user } = useAuth()
  
  const { data, error, isLoading, mutate } = useSWR(
    user ? CACHE_KEY : null,
    async () => {
      // Get all tickets assigned to user
      const { data: tickets } = await ticketService.getAll()
      if (!tickets) return []
      
      // Get activities for each ticket
      const activities = await Promise.all(
        tickets
          .filter(ticket => ticket.assignee === user?.id)
          .map(ticket => ticketService.getTicketActivities(ticket.id))
      )
      
      // Flatten activities and sort by date
      return activities
        .flatMap(result => result.data || [])
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 10) // Only show 10 most recent updates
    },
    {
      refreshInterval: 10000, // Refresh every 10 seconds
      revalidateOnFocus: true,
      fallbackData: []
    }
  )

  return {
    updates: data || [],
    loading: isLoading,
    error,
    refresh: () => mutate()
  }
} 