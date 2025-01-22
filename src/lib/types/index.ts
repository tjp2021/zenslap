// Re-export all types
export * from './activities'
export * from './users'
export * from './quick-responses'
export * from './integrations'
export * from './database.types'

// Shared constants
export const TICKET_STATUSES = ['open', 'in_progress', 'closed'] as const
export const TICKET_PRIORITIES = ['low', 'medium', 'high'] as const

export type TicketStatus = typeof TICKET_STATUSES[number]
export type TicketPriority = typeof TICKET_PRIORITIES[number]

// Base ticket interface
export interface Ticket {
  id: string
  title: string
  description: string
  status: TicketStatus
  priority: TicketPriority
  assignee?: string | null
  metadata: Record<string, unknown>
  tags: string[]
  created_at: string
  updated_at: string
}

// DTOs
export interface CreateTicketDTO {
  title: string
  description: string
  status?: TicketStatus
  priority?: TicketPriority
  assignee?: string
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