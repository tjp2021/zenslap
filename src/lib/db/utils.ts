import type { Database } from '@/types/supabase'

type Ticket = Database['public']['Tables']['tickets']['Row']

/**
 * Database table names as constants
 */
export const TABLES = {
  TICKETS: 'tickets',
  USERS: 'users',
  QUEUE: 'queue',
  QUICK_RESPONSES: 'quick_responses',
  RESPONSE_CATEGORIES: 'response_categories'
} as const

/**
 * Type guard for Ticket
 */
export function isTicket(value: unknown): value is Ticket {
  if (!value || typeof value !== 'object') return false
  
  const ticket = value as Partial<Ticket>
  return (
    typeof ticket.id === 'string' &&
    typeof ticket.title === 'string' &&
    typeof ticket.description === 'string' &&
    typeof ticket.status === 'string' &&
    typeof ticket.priority === 'string'
  )
}

/**
 * Generic error handler for database operations
 */
export function handleDbError(error: unknown): string {
  if (error instanceof Error) return error.message
  return String(error)
} 