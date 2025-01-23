// Core type definitions used throughout the application
export enum UserRole {
	ADMIN = 'ADMIN',
	AGENT = 'AGENT',
	USER = 'USER'
}

// Ticket status and priority as const arrays for type safety
export const TICKET_STATUSES = ['open', 'in_progress', 'closed'] as const
export const TICKET_PRIORITIES = ['low', 'medium', 'high'] as const

export type TicketStatus = typeof TICKET_STATUSES[number]
export type TicketPriority = typeof TICKET_PRIORITIES[number]

// Tag related types
export interface Tag {
	id: string
	name: string
	color: string
	created_at: string
	ticket_ids?: string[]
	metadata?: Record<string, unknown>
}

export interface CreateTagData {
	name: string
	color?: string
	ticket_ids?: string[]
}

export interface UpdateTagData {
	name?: string
	color?: string
	ticket_ids?: string[]
}

// Internal note interface
export interface InternalNote {
	id: string
	ticket_id: string
	content: string
	created_by: string
	created_at: string
	updated_at: string
	mentions?: string[] // Array of user IDs who are mentioned
}

// Conversation message interface
export interface TicketMessage {
	id: string
	ticket_id: string
	content: string
	type: 'customer' | 'agent'
	created_by: string
	created_at: string
}

// Base ticket interface
export interface TicketBase {
	id: string
	title: string
	description: string
	status: TicketStatus
	priority: TicketPriority
	metadata: Record<string, unknown>
	tags?: Tag[]
	assignee?: string | null
	created_by: string
	created_at: string
	updated_at: string
}

// Full ticket interface with related data
export interface Ticket extends TicketBase {
	messages?: TicketMessage[]
	internal_notes?: InternalNote[]
}

// Interface for creating a new ticket
export interface CreateTicketDTO {
	title: string
	description: string
	status?: TicketStatus
	priority?: TicketPriority
	metadata?: Record<string, unknown>
	tags?: string[] // Array of tag IDs
	assignee?: string | null
}

// Interface for updating a ticket
export interface UpdateTicketDTO {
	id: string
	title?: string
	description?: string
	status?: TicketStatus
	priority?: TicketPriority
	metadata?: Record<string, unknown>
	tags?: string[] // Array of tag IDs
	assignee?: string | null
}

// Response interfaces
export interface ApiResponse<T> {
	data: T | null
	error: Error | string | null
}

export interface OperationResponse {
	success: boolean
	error?: string
}

export interface User {
	id: string
	email: string
	role: UserRole
	created_at: string
}

// Validation schemas will be defined in a separate validation.ts file

export interface Message {
	id: string
	content: string
	ticket_id: string
	created_by: string
	created_at: string
	metadata?: Record<string, unknown>
}

export interface Comment {
	id: string
	ticket_id: string
	content: string
	created_at: string
	created_by: string
	updated_at: string | null
	is_internal: boolean
}

export interface CommentCreate {
	ticket_id: string
	content: string
	is_internal: boolean
}

export type ActivityType = 'comment' | 'status_change' | 'field_change' | 'assignment'

export interface TicketActivity {
	id: string
	ticket_id: string
	actor_id: string
	activity_type: ActivityType
	content: {
		message?: string
		is_internal?: boolean
		old_value?: string
		new_value?: string
		field_name?: string
	}
	created_at: string
}

export interface CreateActivityDTO {
	ticket_id: string
	activity_type: ActivityType
	content: {
		message?: string
		is_internal?: boolean
		old_value?: string
		new_value?: string
		field_name?: string
	}
}