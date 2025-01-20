import { NextApiRequest, NextApiResponse } from 'next'
import { supabase } from '@/lib/supabase/client'
import type { TicketBase, TicketResponse, TicketsResponse } from '../types'
import type { SupabaseClient } from '@supabase/supabase-js'

type ApiHandler = (
	req: NextApiRequest,
	res: NextApiResponse,
	supabase: SupabaseClient
) => Promise<void>

/**
 * Creates a route handler with error handling and Supabase client injection
 */
export const createHandler = (handler: ApiHandler) => {
	return async (req: NextApiRequest, res: NextApiResponse) => {
		try {
			await handler(req, res, supabase)
		} catch (error) {
			console.error('API Error:', error)
			res.status(500).json({ error: 'Internal server error' })
		}
	}
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

// Database table names
export const TABLES = {
	TICKETS: 'tickets'
} as const

// Type guard for TicketBase
export const isTicketBase = (ticket: unknown): ticket is TicketBase => {
	return (
		typeof ticket === 'object' &&
		ticket !== null &&
		'id' in ticket &&
		'title' in ticket &&
		'description' in ticket &&
		'status' in ticket &&
		'priority' in ticket
	)
}

// Response type guards
export const isTicketResponse = (response: unknown): response is TicketResponse => {
	return (
		typeof response === 'object' &&
		response !== null &&
		'data' in response &&
		'error' in response &&
		(response.data === null || isTicketBase(response.data)) &&
		(response.error === null || typeof response.error === 'string')
	)
}

export const isTicketsResponse = (response: unknown): response is TicketsResponse => {
	return (
		typeof response === 'object' &&
		response !== null &&
		'data' in response &&
		'error' in response &&
		Array.isArray(response.data) &&
		response.data.every(isTicketBase) &&
		(response.error === null || typeof response.error === 'string')
	)
} 