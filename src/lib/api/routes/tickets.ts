import { createRouteHandler } from '@/lib/api/utils'
import { TicketStatus, TicketPriority } from '@/lib/types'
import { NextApiRequest, NextApiResponse } from 'next'
import { SupabaseClient } from '@supabase/supabase-js'

export interface CreateTicketPayload {
	title: string
	description: string
	priority: TicketPriority
	metadata?: Record<string, unknown>
}

export interface UpdateTicketPayload {
	status?: TicketStatus
	priority?: TicketPriority
	metadata?: Record<string, unknown>
}

// Export the raw handler for testing
export async function handleCreateTicket(
	req: NextApiRequest,
	res: NextApiResponse,
	supabase: SupabaseClient
) {
	const payload = req.body as CreateTicketPayload
	
	const { data, error } = await supabase
		.from('tickets')
		.insert({
			...payload,
			status: TicketStatus.OPEN,
			created_at: new Date().toISOString(),
			updated_at: new Date().toISOString()
		})
		.select()
		.single()

	if (error) throw error
	return data
}

// Export the wrapped handler for API routes
export const createTicket = createRouteHandler(handleCreateTicket)

// Export the raw handler for testing
export async function handleUpdateTicket(
	req: NextApiRequest,
	res: NextApiResponse,
	supabase: SupabaseClient
) {
	const { id } = req.query
	if (!id) {
		res.status(400).json({ error: 'Missing ticket ID' })
		return
	}

	const payload = req.body as UpdateTicketPayload

	const { data, error } = await supabase
		.from('tickets')
		.update({
			...payload,
			updated_at: new Date().toISOString()
		})
		.eq('id', id)
		.select()
		.single()

	if (error) throw error
	return data
}

// Export the wrapped handler for API routes
export const updateTicket = createRouteHandler(handleUpdateTicket) 