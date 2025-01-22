import { useState, useEffect } from 'react'
import type { TicketCounts } from '@/lib/api/routes/tickets'

export function useTicketCounts(userId: string | undefined) {
	const [counts, setCounts] = useState<TicketCounts>({ personal: 0, group: 0 })
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<Error | null>(null)

	useEffect(() => {
		// Don't fetch if no userId
		if (!userId) {
			setLoading(false)
			return
		}

		async function fetchCounts() {
			try {
				const response = await fetch(`/api/tickets/counts?userId=${userId}`)
				if (!response.ok) throw new Error('Failed to fetch ticket counts')
				const data = await response.json()
				setCounts(data)
			} catch (err) {
				setError(err instanceof Error ? err : new Error('Unknown error'))
			} finally {
				setLoading(false)
			}
		}

		fetchCounts()
	}, [userId])

	return { counts, loading, error }
} 