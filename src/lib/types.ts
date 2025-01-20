// Core type definitions used throughout the application
export enum UserRole {
	ADMIN = 'ADMIN',
	AGENT = 'AGENT',
	USER = 'USER'
}

// Ticket status and priority as const arrays for type safety
export const TICKET_STATUSES = ['open', 'in_progress', 'resolved', 'closed'] as const
export const TICKET_PRIORITIES = ['low', 'medium', 'high', 'urgent'] as const

export type TicketStatus = typeof TICKET_STATUSES[number]
export type TicketPriority = typeof TICKET_PRIORITIES[number]

// Base ticket interface with core properties
export interface TicketBase {
	id: string
	title: string
	description: string
	status: TicketStatus
	priority: TicketPriority
	metadata: Record<string, unknown>
	created_at: string
	updated_at: string
}

export interface User {
	id: string
	email: string
	role: UserRole
	created_at: string
}

// Interface for creating a new ticket (omit system-generated fields)
export type CreateTicketDTO = Omit<TicketBase, 'id' | 'created_at' | 'updated_at'>

// Interface for updating a ticket (all fields optional except id)
export type UpdateTicketDTO = Partial<Omit<TicketBase, 'id'>> & { id: string }

// Response interfaces
export interface TicketResponse {
	data: TicketBase | null
	error: string | null
}

export interface TicketsResponse {
	data: TicketBase[]
	error: string | null
}

// Validation schemas will be defined in a separate validation.ts file

export type Ticket = {
	id: string
	title: string
	description: string
	status: 'open' | 'in_progress' | 'closed'
	priority: 'low' | 'medium' | 'high'
	metadata: Record<string, unknown>
	created_at: string
	updated_at: string
}

export type CreateTicketDTO = Omit<Ticket, 'id' | 'created_at' | 'updated_at'> & {
	status?: Ticket['status']
	priority?: Ticket['priority']
	metadata?: Record<string, unknown>
}