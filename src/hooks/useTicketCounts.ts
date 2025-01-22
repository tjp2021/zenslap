import useSWR from 'swr'
import type { TicketCounts } from '@/lib/api/routes/tickets'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '@/types/supabase'

export function useTicketCounts(userId: string) {
	const { data, error } = useSWR(
		userId ? `ticket-counts-${userId}` : null,
		async () => {
			const supabase = createClientComponentClient<Database>()
			
			// Get personal tickets (assigned directly to user)
			const { data: personalTickets, error: personalError } = await supabase
				.from('tickets')
				.select('*')
				.eq('assignee', userId)
				.eq('status', 'open')
			
			if (personalError) throw personalError

			// Get group tickets (unassigned or assigned to others)
			const { data: groupTickets, error: groupError } = await supabase
				.from('tickets')
				.select('*')
				.neq('assignee', userId)
				.eq('status', 'open')
			
			if (groupError) throw groupError

			return {
				data: {
					personal: personalTickets.length,
					group: groupTickets.length
				}
			}
		},
		{
			revalidateOnFocus: true,
			revalidateOnReconnect: true,
			dedupingInterval: 30000 // 30 seconds
		}
	)

	return {
		counts: data?.data || { personal: 0, group: 0 },
		isLoading: !error && !data,
		isError: error
	}
} 