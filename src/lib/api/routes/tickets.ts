import { supabase } from '@/lib/supabase/client'
import { TicketStatus, TicketPriority } from '@/lib/types'
import { type TicketActivity } from '@/lib/types/activities'
import { handleError, createSuccessResponse, type ApiResponse, ApiError } from '@/lib/utils/error-handling'
import { createTicketSchema, updateTicketSchema } from '@/lib/validation/tickets'

export interface Ticket {
	id: string
	title: string
	description: string
	status: TicketStatus
	priority: TicketPriority
	assignee: string | null
	metadata: Record<string, unknown>
	tags: string[]
	created_at: string
	updated_at: string
}

export interface CreateTicketDTO {
	title: string
	description: string
	status?: TicketStatus
	priority?: TicketPriority
	assignee?: string | null
	metadata?: Record<string, unknown>
	tags?: string[]
}

export interface UpdateTicketDTO {
	title?: string
	description?: string
	status?: TicketStatus
	priority?: TicketPriority
	assignee?: string | null
	metadata?: Record<string, unknown>
	tags?: string[]
}

export interface TicketCounts {
	personal: number
	group: number
}

export const getAll = async (): Promise<ApiResponse<Ticket[]>> => {
	try {
		const { data, error } = await supabase
			.from('tickets')
			.select()

		if (error) throw error
		return createSuccessResponse(data)
	} catch (err) {
		return handleError(err, 'getAll')
	}
}

export const getById = async (id: string): Promise<ApiResponse<Ticket>> => {
	try {
		if (!id) throw new ApiError('Ticket ID is required')

		const { data, error } = await supabase
			.from('tickets')
			.select()
			.eq('id', id)
			.single()

		if (error) throw error
		return createSuccessResponse(data)
	} catch (err) {
		return handleError(err, 'getById', { id })
	}
}

export const create = async (data: CreateTicketDTO): Promise<ApiResponse<Ticket>> => {
	try {
		// Validate with Zod schema
		const validatedData = createTicketSchema.parse(data)

		const { data: result, error } = await supabase
			.from('tickets')
			.insert(validatedData)
			.select()
			.single()

		if (error) throw error
		return createSuccessResponse(result)
	} catch (err) {
		return handleError(err, 'create', { data })
	}
}

export const update = async (id: string, data: UpdateTicketDTO): Promise<ApiResponse<Ticket>> => {
	try {
		if (!id) throw new ApiError('Ticket ID is required')

		// Validate with Zod schema
		const validatedData = updateTicketSchema.parse({ ...data, id })

		// Get current user ID for activity tracking
		const { data: { user }, error: userError } = await supabase.auth.getUser()
		if (userError) throw userError
		if (!user) throw new ApiError('User not authenticated')

		const { data: result, error } = await supabase
			.rpc('update_ticket_with_activity', {
				p_ticket_id: id,
				p_updates: validatedData,
				p_actor_id: user.id
			})

		if (error) throw error
		return createSuccessResponse(result)
	} catch (err) {
		return handleError(err, 'update', { id, data })
	}
}

export const deleteTicket = async (id: string): Promise<ApiResponse<{ success: true }>> => {
	try {
		if (!id) throw new ApiError('Ticket ID is required')

		const { error } = await supabase
			.from('tickets')
			.delete()
			.eq('id', id)

		if (error) throw error
		return createSuccessResponse({ success: true })
	} catch (err) {
		return handleError(err, 'delete', { id })
	}
}

export const getCounts = async (userId: string): Promise<ApiResponse<TicketCounts>> => {
	try {
		if (!userId) {
			return createSuccessResponse({ personal: 0, group: 0 })
		}

		// Get personal tickets count
		const { data: personalData, error: personalError } = await supabase
			.from('tickets')
			.select('*', { count: 'exact' })
			.eq('assignee', userId)
			.eq('status', 'open')

		if (personalError) throw personalError

		// Get group tickets count
		const { data: groupData, error: groupError } = await supabase
			.from('tickets')
			.select('*', { count: 'exact' })
			.is('assignee', null)
			.eq('status', 'open')

		if (groupError) throw groupError

		return createSuccessResponse({
			personal: personalData?.length || 0,
			group: groupData?.length || 0
		})
	} catch (err) {
		return handleError(err, 'getCounts', { userId })
	}
}

export const getTicketActivities = async (ticketId: string): Promise<ApiResponse<TicketActivity[]>> => {
	try {
		if (!ticketId) throw new ApiError('Ticket ID is required')

		const { data, error } = await supabase
			.from('ticket_activities')
			.select('*')
			.eq('ticket_id', ticketId)
			.order('created_at', { ascending: false })

		if (error) throw error
		return createSuccessResponse(data)
	} catch (err) {
		return handleError(err, 'getTicketActivities', { ticketId })
	}
}

export const ticketService = {
	getAll,
	getById,
	create,
	update,
	delete: deleteTicket,
	getCounts,
	getTicketActivities
}