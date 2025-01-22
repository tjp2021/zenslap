import useSWR from 'swr'
import { ticketService } from '@/lib/api/routes/tickets'
import type { TicketStatistics } from '@/lib/api/routes/tickets'

const CACHE_KEY = 'ticket-statistics'

export function useTicketStatistics() {
  const { data, error, isLoading, mutate } = useSWR(
    CACHE_KEY,
    async () => {
      const { data, error } = await ticketService.getStatistics()
      if (error) throw error
      return data
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