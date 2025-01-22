import { useEffect, useState } from 'react'
import { ticketService } from '@/lib/api/routes/tickets'
import type { TicketCounts } from '@/lib/api/routes/tickets'
import { useAuth } from '@/lib/hooks/useAuth'

export function useTicketCounts() {
	const [counts, setCounts] = useState<TicketCounts>({ personal: 0, group: 0 })
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<Error | null>(null)
	const { user, loading: authLoading } = useAuth()

	useEffect(() => {
		// Don't fetch if still loading auth
		if (authLoading) return

		async function fetchCounts() {
			if (!user?.id) {
				setLoading(false)
				return
			}

			setLoading(true)
			setError(null)
			
			const { data, error: apiError } = await ticketService.getCounts(user.id)
			
			if (apiError) {
				setError(new Error(String(apiError)))
			} else if (data) {
				setCounts(data)
			}
			
			setLoading(false)
		}

		fetchCounts()
	}, [user?.id, authLoading])

	return { counts, loading: loading || authLoading, error }
} 