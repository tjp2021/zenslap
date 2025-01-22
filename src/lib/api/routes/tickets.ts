import type { Ticket, CreateTicketDTO, UpdateTicketDTO } from '@/lib/types'
import type { TicketActivity, ActivityType, ActivityContent } from '@/lib/types/activities'
import { handleError, createSuccessResponse, type ApiResponse } from '@/lib/utils/error-handling'
import { RepositoryFactory } from '@/lib/repositories'
import type { ITicketRepository } from '@/lib/repositories/ticket.repository'

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
	private readonly repository: ITicketRepository

	constructor() {
		this.repository = RepositoryFactory.getTicketRepository()
	}

	// Get all tickets
	async getAll(): Promise<ApiResponse<Ticket[]>> {
		try {
			const data = await this.repository.findAll()
			return createSuccessResponse(data)
		} catch (error) {
			return handleError(error, 'getAll tickets')
		}
	}

	// Get ticket counts for a user
	async getCounts(userId: string): Promise<ApiResponse<TicketCounts>> {
		try {
			const assignedTickets = await this.repository.findByAssignee(userId)
			return createSuccessResponse({
				personal: assignedTickets.length,
				group: 0 // No group concept in current schema
			})
		} catch (error) {
			return handleError(error, 'getCounts', { userId })
		}
	}

	// Get ticket by id
	async getById(id: string): Promise<ApiResponse<Ticket | null>> {
		try {
			const data = await this.repository.findById(id)
			return createSuccessResponse(data)
		} catch (error) {
			return handleError(error, 'getById', { id })
		}
	}

	// Create ticket
	async create(ticket: CreateTicketDTO): Promise<ApiResponse<Ticket>> {
		try {
			const data = await this.repository.create(ticket)
			return createSuccessResponse(data)
		} catch (error) {
			return handleError(error, 'create ticket', { ticket })
		}
	}

	// Update ticket
	async update(id: string, updates: UpdateTicketDTO): Promise<ApiResponse<Ticket>> {
		try {
			const data = await this.repository.update(id, updates)
			return createSuccessResponse(data)
		} catch (error) {
			return handleError(error, 'update ticket', { id, updates })
		}
	}

	// Delete ticket
	async delete(id: string): Promise<ApiResponse<void>> {
		try {
			await this.repository.delete(id)
			return createSuccessResponse(undefined)
		} catch (error) {
			return handleError(error, 'delete ticket', { id })
		}
	}

	// Get ticket activities
	async getActivities(ticketId: string): Promise<ApiResponse<TicketActivity[]>> {
		try {
			const data = await this.repository.getActivities(ticketId)
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
			const data = await this.repository.addActivity(ticketId, actorId, type, content)
			return createSuccessResponse(data)
		} catch (error) {
			return handleError(error, 'add activity', { ticketId, actorId, type })
		}
	}

	// Get ticket statistics
	async getStatistics(): Promise<ApiResponse<TicketStatistics>> {
		try {
			const stats = await this.repository.getWeeklyStatistics()
			return createSuccessResponse(stats)
		} catch (error) {
			return handleError(error, 'getStatistics')
		}
	}
}

// Export singleton instance
export const ticketService = new TicketService()