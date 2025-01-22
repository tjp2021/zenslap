import useSWR from 'swr'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '@/types/supabase'

export function useTicketUpdates(ticketId: string) {
  const { data, error, mutate } = useSWR(
    ticketId ? `ticket-updates-${ticketId}` : null,
    async () => {
      const supabase = createClientComponentClient<Database>()
      const { data, error } = await supabase
        .from('ticket_activities')
        .select()
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true })
      
      if (error) throw error
      return { data }
    },
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      dedupingInterval: 5000 // 5 seconds
    }
  )

  return {
    updates: data?.data || [],
    isLoading: !error && !data,
    isError: error,
    mutate
  }
} 