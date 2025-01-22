import { supabase } from '@/lib/supabase/client'
import type { Ticket, CreateTicketDTO, UpdateTicketDTO } from '@/lib/types'
import type { TicketActivity, ActivityType, ActivityContent } from '@/lib/types/activities'
import { handleError, createSuccessResponse, type ApiResponse } from '@/lib/utils/error-handling'

export interface TicketCounts {
	personal: number
	group: number
}

export interface TicketStatistics {
	good: number    // Tickets resolved within SLA
	bad: number     // Tickets that violated SLA
	solved: number  // Total tickets solved this week
}

// Service for managing tickets
export const ticketService = {
	// Get all tickets
	async getAll(): Promise<ApiResponse<Ticket[]>> {
		try {
			const { data, error } = await supabase
				.from('tickets')
				.select('*')
				.order('created_at', { ascending: false })

			if (error) throw error
			return createSuccessResponse(data || [])
		} catch (error) {
			return handleError(error, 'getAll tickets')
		}
	},

	// Get ticket counts for a user
	async getCounts(userId: string): Promise<ApiResponse<TicketCounts>> {
		try {
			const { data: assignedData, error: assignedError } = await supabase
				.from('tickets')
				.select('id')
				.eq('assignee', userId)

			if (assignedError) throw assignedError

			return createSuccessResponse({
				personal: assignedData?.length || 0,
				group: 0 // No group concept in current schema
			})
		} catch (error) {
			return handleError(error, 'getCounts', { userId })
		}
	},

	// Get ticket by id
	async getById(id: string): Promise<ApiResponse<Ticket | null>> {
		try {
			const { data, error } = await supabase
				.from('tickets')
				.select('*')
				.eq('id', id)
				.single()

			if (error) throw error
			return createSuccessResponse(data)
		} catch (error) {
			return handleError(error, 'getById', { id })
		}
	},

	// Create ticket
	async create(ticket: CreateTicketDTO): Promise<ApiResponse<Ticket>> {
		try {
			const { data, error } = await supabase
				.from('tickets')
				.insert(ticket)
				.select()
				.single()

			if (error) throw error
			return createSuccessResponse(data)
		} catch (error) {
			return handleError(error, 'create ticket', { ticket })
		}
	},

	// Update ticket
	async update(id: string, updates: UpdateTicketDTO): Promise<ApiResponse<Ticket>> {
		try {
			const { data, error } = await supabase
				.from('tickets')
				.update(updates)
				.eq('id', id)
				.select()
				.single()

			if (error) throw error
			return createSuccessResponse(data)
		} catch (error) {
			return handleError(error, 'update ticket', { id, updates })
		}
	},

	// Delete ticket
	async delete(id: string): Promise<ApiResponse<void>> {
		try {
			const { error } = await supabase
				.from('tickets')
				.delete()
				.eq('id', id)

			if (error) throw error
			return createSuccessResponse(undefined)
		} catch (error) {
			return handleError(error, 'delete ticket', { id })
		}
	},

	// Get ticket activities
	async getActivities(ticketId: string): Promise<ApiResponse<TicketActivity[]>> {
		try {
			const { data, error } = await supabase
				.from('ticket_activities')
				.select('*')
				.eq('ticket_id', ticketId)
				.order('created_at', { ascending: false })

			if (error) throw error
			return createSuccessResponse(data || [])
		} catch (error) {
			return handleError(error, 'get activities', { ticketId })
		}
	},

	// Add activity
	async addActivity(
		ticketId: string,
		actorId: string,
		type: ActivityType,
		content: ActivityContent['content']
	): Promise<ApiResponse<TicketActivity>> {
		try {
			const { data, error } = await supabase
				.from('ticket_activities')
				.insert({
					ticket_id: ticketId,
					actor_id: actorId,
					activity_type: type,
					content
				})
				.select()
				.single()

			if (error) throw error
			return createSuccessResponse(data)
		} catch (error) {
			return handleError(error, 'add activity', { ticketId, actorId, type })
		}
	},

	// Get ticket statistics for this week
	async getStatistics(): Promise<ApiResponse<TicketStatistics>> {
		try {
			const startOfWeek = new Date()
			startOfWeek.setHours(0, 0, 0, 0)
			startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay())

			const { data: solvedThisWeek, error: solvedError } = await supabase
				.from('tickets')
				.select('id, created_at, updated_at')
				.eq('status', 'closed')
				.gte('updated_at', startOfWeek.toISOString())

			if (solvedError) throw solvedError

			// Calculate SLA metrics (assuming 24h SLA for now)
			const slaTime = 24 * 60 * 60 * 1000 // 24 hours in milliseconds
			let goodCount = 0
			let badCount = 0

			solvedThisWeek?.forEach(ticket => {
				const created = new Date(ticket.created_at)
				const updated = new Date(ticket.updated_at)
				const resolutionTime = updated.getTime() - created.getTime()
				
				if (resolutionTime <= slaTime) {
					goodCount++
				} else {
					badCount++
				}
			})

			return createSuccessResponse({
				good: goodCount,
				bad: badCount,
				solved: solvedThisWeek?.length || 0
			})
		} catch (error) {
			return handleError(error, 'getStatistics')
		}
	}
}