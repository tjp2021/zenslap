import type { Ticket, CreateTicketDTO, UpdateTicketDTO } from '@/lib/types'
import type { TicketActivity, ActivityType, ActivityContent } from '@/lib/types/activities'
import { handleError, createSuccessResponse, type ApiResponse } from '@/lib/utils/error-handling'
import { createServerClient } from '@/lib/supabase/server'

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
class TicketService {
	private async getClient() {
		return await createServerClient()
	}

	// Get all tickets
	async getAll(): Promise<ApiResponse<Ticket[]>> {
		try {
			const supabase = await this.getClient()
			const { data, error } = await supabase
				.from('tickets')
				.select('*')
				.order('created_at', { ascending: false })
			
			if (error) throw error
			return createSuccessResponse(data)
		} catch (error) {
			return handleError(error, 'getAll tickets')
		}
	}

	// Get ticket counts for a user
	async getCounts(userId: string): Promise<ApiResponse<TicketCounts>> {
		try {
			const supabase = await this.getClient()
			
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

			return createSuccessResponse({
				personal: personalTickets.length,
				group: groupTickets.length
			})
		} catch (error) {
			return handleError(error, 'getCounts', { userId })
		}
	}

	// Get ticket by id
	async getById(id: string): Promise<ApiResponse<Ticket | null>> {
		try {
			const supabase = await this.getClient()
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
	}

	// Create ticket
	async create(ticket: CreateTicketDTO): Promise<ApiResponse<Ticket>> {
		try {
			const supabase = await this.getClient()
			const { data, error } = await supabase
				.from('tickets')
				.insert([ticket])
				.select()
				.single()
			
			if (error) throw error
			return createSuccessResponse(data)
		} catch (error) {
			return handleError(error, 'create ticket', { ticket })
		}
	}

	// Update ticket
	async update(id: string, updates: UpdateTicketDTO): Promise<ApiResponse<Ticket>> {
		try {
			const supabase = await this.getClient()
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
	}

	// Delete ticket
	async delete(id: string): Promise<ApiResponse<void>> {
		try {
			const supabase = await this.getClient()
			const { error } = await supabase
				.from('tickets')
				.delete()
				.eq('id', id)
			
			if (error) throw error
			return createSuccessResponse(undefined)
		} catch (error) {
			return handleError(error, 'delete ticket', { id })
		}
	}

	// Get ticket activities
	async getActivities(ticketId: string): Promise<ApiResponse<TicketActivity[]>> {
		try {
			const supabase = await this.getClient()
			const { data, error } = await supabase
				.from('ticket_activities')
				.select('*')
				.eq('ticket_id', ticketId)
				.order('created_at', { ascending: true })
			
			if (error) throw error
			return createSuccessResponse(data)
		} catch (error) {
			return handleError(error, 'get activities', { ticketId })
		}
	}

	// Add activity
	async addActivity(
		ticketId: string,
		actorId: string,
		type: ActivityType,
		content: ActivityContent['content']
	): Promise<ApiResponse<TicketActivity>> {
		try {
			const supabase = await this.getClient()
			const { data, error } = await supabase
				.from('ticket_activities')
				.insert([{
					ticket_id: ticketId,
					actor_id: actorId,
					type,
					content
				}])
				.select()
				.single()
			
			if (error) throw error
			return createSuccessResponse(data)
		} catch (error) {
			return handleError(error, 'add activity', { ticketId, actorId, type })
		}
	}

	// Get ticket statistics
	async getStatistics(): Promise<ApiResponse<TicketStatistics>> {
		try {
			const supabase = await this.getClient()
			const { data: tickets, error } = await supabase
				.from('tickets')
				.select('*')
				.gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
			
			if (error) throw error

			const stats = {
				good: 0,
				bad: 0,
				solved: 0
			}

			tickets.forEach(ticket => {
				if (ticket.status === 'closed') {
					stats.solved++
					// Simple SLA check - if closed within 24 hours
					const created = new Date(ticket.created_at)
					const closed = new Date(ticket.updated_at)
					const hours = (closed.getTime() - created.getTime()) / (1000 * 60 * 60)
					if (hours <= 24) {
						stats.good++
					} else {
						stats.bad++
					}
				}
			})

			return createSuccessResponse(stats)
		} catch (error) {
			return handleError(error, 'getStatistics')
		}
	}
}

// Export singleton instance
export const ticketService = new TicketService()