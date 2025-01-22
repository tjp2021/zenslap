import useSWR from 'swr'
import type { TicketStatistics } from '@/lib/api/routes/tickets'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '@/types/supabase'

export function useTicketStatistics() {
  const { data, error } = useSWR(
    'ticket-statistics',
    async () => {
      const supabase = createClientComponentClient<Database>()
      const { data: tickets, error } = await supabase
        .from('tickets')
        .select('*')
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      
      if (error) throw error

      const stats = {
        good: 0,
        bad: 0,
        solved: 0
      }

      tickets.forEach(ticket => {
        if (ticket.status === 'closed') {
          stats.solved++
          // Simple SLA check - if closed within 24 hours
          const created = new Date(ticket.created_at)
          const closed = new Date(ticket.updated_at)
          const hours = (closed.getTime() - created.getTime()) / (1000 * 60 * 60)
          if (hours <= 24) {
            stats.good++
          } else {
            stats.bad++
          }
        }
      })

      return { data: stats }
    },
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      dedupingInterval: 60000 // 1 minute
    }
  )

  return {
    statistics: data?.data || { good: 0, bad: 0, solved: 0 },
    isLoading: !error && !data,
    isError: error
  }
} 