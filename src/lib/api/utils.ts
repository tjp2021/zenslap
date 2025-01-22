import { createApiClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import type { Database } from '@/types/supabase'

type Ticket = Database['public']['Tables']['tickets']['Row']

/**
 * Creates a route handler for API endpoints
 * Handles authentication and error responses
 */
export async function createHandler<T>(
	req: NextRequest,
	handler: () => Promise<T>
) {
	try {
		const supabase = createApiClient()
		const { data: { session } } = await supabase.auth.getSession()

		if (!session) {
			return NextResponse.json(
				{ error: 'Unauthorized' },
				{ status: 401 }
			)
		}

		const result = await handler()
		return NextResponse.json(result)
	} catch (error) {
		console.error('API error:', error)
		return NextResponse.json(
			{ error: 'Internal server error' },
			{ status: 500 }
		)
	}
}

// Database table names as constants
export const TABLES = {
	TICKETS: 'tickets',
	USERS: 'users',
	QUEUE: 'queue',
	QUICK_RESPONSES: 'quick_responses',
	RESPONSE_CATEGORIES: 'response_categories'
} as const

// Type guard for Ticket
export function isTicket(value: unknown): value is Ticket {
	if (!value || typeof value !== 'object') return false
	
	const ticket = value as Partial<Ticket>
	return (
		typeof ticket.id === 'string' &&
		typeof ticket.title === 'string' &&
		typeof ticket.description === 'string' &&
		typeof ticket.status === 'string' &&
		typeof ticket.priority === 'string'
	)
}

// Generic error handler
export const handleError = (error: unknown): string => {
	if (error instanceof Error) return error.message
	return String(error)
}

// Generic response wrapper
export const wrapResponse = <T>(data: T | null, error: string | null): { data: T | null; error: string | null } => ({
	data,
	error
}) 