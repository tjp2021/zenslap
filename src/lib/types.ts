// Core type definitions used throughout the application
export enum TicketStatus {
	OPEN = 'OPEN',
	IN_PROGRESS = 'IN_PROGRESS',
	CLOSED = 'CLOSED'
}

export enum TicketPriority {
	LOW = 'LOW',
	MEDIUM = 'MEDIUM',
	HIGH = 'HIGH'
}

export enum UserRole {
	ADMIN = 'ADMIN',
	AGENT = 'AGENT',
	USER = 'USER'
}

// Base ticket interface
export interface Ticket {
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