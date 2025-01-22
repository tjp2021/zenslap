import useSWR from 'swr'
import type { TicketActivity } from '@/lib/types/activities'

export function useTicketUpdates(ticketId: string) {
  const { data, error, isLoading, mutate } = useSWR<TicketActivity[]>(
    ticketId ? `/api/tickets/${ticketId}/activities` : null,
    async () => {
      const response = await fetch(`/api/tickets/${ticketId}/activities`)
      if (!response.ok) {
        throw new Error('Failed to fetch ticket activities')
      }
      return response.json()
    },
    {
      refreshInterval: 5000, // Refresh every 5 seconds
      revalidateOnFocus: true
    }
  )

  return {
    activities: data || [],
    loading: isLoading,
    error,
    refresh: () => mutate()
  }
} 