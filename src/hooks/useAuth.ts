import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import type { User } from '@/lib/types'
import type { AuthChangeEvent, Session } from '@supabase/supabase-js'

export function useAuth() {
	const [user, setUser] = useState<User | null>(null)
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<Error | null>(null)

	useEffect(() => {
		async function getUser() {
			try {
				const { data: { user }, error } = await supabase.auth.getUser()
				
				if (error) throw error
				
				if (user) {
					setUser({
						id: user.id,
						email: user.email!,
						role: user.user_metadata.role,
						created_at: user.created_at
					})
				}
			} catch (err) {
				setError(err instanceof Error ? err : new Error('Failed to get user'))
			} finally {
				setLoading(false)
			}
		}

		// Initial fetch
		getUser()

		// Subscribe to auth changes
		const { data: { subscription } } = supabase.auth.onAuthStateChange(
			async (event: AuthChangeEvent, session: Session | null) => {
				if (event === 'SIGNED_OUT') {
					setUser(null)
				} else if (session?.user) {
					const user = session.user
					setUser({
						id: user.id,
						email: user.email!,
						role: user.user_metadata.role,
						created_at: user.created_at
					})
				}
			}
		)

		return () => {
			subscription.unsubscribe()
		}
	}, [])

	return { user, loading, error }
} 