import { z } from 'zod'
import type { TicketStatus, TicketPriority } from './types'

// Enum values for validation
const ticketStatusEnum = ['open', 'in_progress', 'resolved', 'closed'] as const
const ticketPriorityEnum = ['low', 'medium', 'high', 'urgent'] as const

// Base ticket schema
export const ticketSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(255),
  description: z.string().min(1),
  status: z.enum(ticketStatusEnum),
  priority: z.enum(ticketPriorityEnum),
  metadata: z.record(z.unknown()).default({}),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime()
})

// Create ticket schema (omit system-generated fields)
export const createTicketSchema = ticketSchema.omit({ 
  id: true, 
  created_at: true, 
  updated_at: true 
})

// Update ticket schema (all fields optional except id)
export const updateTicketSchema = ticketSchema
  .omit({ created_at: true, updated_at: true })
  .partial()
  .required({ id: true })

// Response schemas
export const ticketResponseSchema = z.object({
  data: ticketSchema.nullable(),
  error: z.string().nullable()
})

export const ticketsResponseSchema = z.object({
  data: z.array(ticketSchema),
  error: z.string().nullable()
}) 