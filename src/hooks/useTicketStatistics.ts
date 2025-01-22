import useSWR from 'swr'
import type { TicketStatistics } from '@/lib/api/routes/tickets'

const CACHE_KEY = 'ticket-statistics'

export function useTicketStatistics() {
  const { data, error, isLoading, mutate } = useSWR<TicketStatistics>(
    CACHE_KEY,
    async () => {
      const response = await fetch('/api/tickets/statistics')
      if (!response.ok) {
        throw new Error('Failed to fetch ticket statistics')
      }
      return response.json()
    },
    {
      refreshInterval: 30000, // Refresh every 30 seconds
      revalidateOnFocus: true,
      fallbackData: { good: 0, bad: 0, solved: 0 }
    }
  )

  return {
    stats: data || { good: 0, bad: 0, solved: 0 },
    loading: isLoading,
    error,
    refresh: () => mutate()
  }
} 