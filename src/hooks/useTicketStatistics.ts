import { useEffect, useState } from 'react'
import { ticketService } from '@/lib/api/routes/tickets'
import type { TicketStatistics } from '@/lib/api/routes/tickets'

export function useTicketStatistics() {
  const [stats, setStats] = useState<TicketStatistics>({ good: 0, bad: 0, solved: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    async function fetchStats() {
      setLoading(true)
      setError(null)
      
      const { data, error: fetchError } = await ticketService.getWeeklyStatistics()
      
      if (fetchError) {
        setError(typeof fetchError === 'string' ? new Error(fetchError) : fetchError)
      } else if (data) {
        setStats(data)
      }
      
      setLoading(false)
    }

    fetchStats()
  }, [])

  return { stats, loading, error }
} 