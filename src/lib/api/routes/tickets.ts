import getSupabaseClient from '@/lib/supabase/client'
import { TicketStatus, TicketPriority } from '@/lib/types'

export interface CreateTicketDTO {
	title: string
	description: string
	status: TicketStatus
	priority: TicketPriority
	metadata: Record<string, any>
	tags?: string[]
}

export interface UpdateTicketDTO {
	id: string
	title?: string
	description?: string
	status?: TicketStatus
	priority?: TicketPriority
	metadata?: Record<string, any>
	tags?: string[]
}

export const getAll = async (supabase = getSupabaseClient()) => {
	try {
		const { data, error } = await supabase
			.from('tickets')
			.select()

		if (error) {
			console.error('Get tickets error:', error)
			return {
				data: null,
				error
			}
		}

		return {
			data,
			error: null
		}
	} catch (_err) {
		console.error('Get tickets error:', _err)
		return {
			data: null,
			error: _err instanceof Error ? _err : new Error('Failed to get tickets')
		}
	}
}

export const getById = async (id: string, supabase = getSupabaseClient()) => {
	try {
		if (!id) {
			return {
				data: null,
				error: new Error('Ticket ID is required')
			}
		}

		const { data, error } = await supabase
			.from('tickets')
			.select()
			.eq('id', id)
			.single()

		if (error) {
			console.error('Get ticket error:', error)
			return {
				data: null,
				error
			}
		}

		return {
			data,
			error: null
		}
	} catch (_err) {
		console.error('Get ticket error:', _err)
		return {
			data: null,
			error: _err instanceof Error ? _err : new Error('Failed to get ticket')
		}
	}
}

export const create = async (data: CreateTicketDTO, supabase = getSupabaseClient()) => {
	try {
		if (!data.title) {
			return {
				data: null,
				error: new Error('Title is required')
			}
		}

		const { data: result, error } = await supabase
			.from('tickets')
			.insert(data)
			.select()
			.single()

		if (error) {
			console.error('Create ticket error:', error)
			return {
				data: null,
				error
			}
		}

		return {
			data: result,
			error: null
		}
	} catch (_err) {
		console.error('Create ticket error:', _err)
		return {
			data: null,
			error: _err instanceof Error ? _err : new Error('Failed to create ticket')
		}
	}
}

export const update = async (id: string, data: UpdateTicketDTO, supabase = getSupabaseClient()) => {
	try {
		if (!id) {
			return {
				data: null,
				error: new Error('Ticket ID is required')
			}
		}

		const { data: result, error } = await supabase
			.from('tickets')
			.update(data)
			.eq('id', id)
			.select()
			.single()

		if (error) {
			console.error('Update ticket error:', error)
			return {
				data: null,
				error
			}
		}

		return {
			data: result,
			error: null
		}
	} catch (_err) {
		console.error('Update ticket error:', _err)
		return {
			data: null,
			error: _err instanceof Error ? _err : new Error('Failed to update ticket')
		}
	}
}

export const deleteTicket = async (id: string, supabase = getSupabaseClient()) => {
	try {
		if (!id) {
			return {
				data: null,
				error: new Error('Ticket ID is required')
			}
		}

		const { error } = await supabase
			.from('tickets')
			.delete()
			.eq('id', id)

		if (error) {
			console.error('Delete ticket error:', error)
			return {
				data: null,
				error
			}
		}

		return {
			data: { success: true },
			error: null
		}
	} catch (_err) {
		console.error('Delete ticket error:', _err)
		return {
			data: null,
			error: _err instanceof Error ? _err : new Error('Failed to delete ticket')
		}
	}
}

export const ticketService = {
	getAll,
	getById,
	create,
	update,
	delete: deleteTicket
}