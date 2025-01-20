import { z } from 'zod'
import { TICKET_PRIORITIES, TICKET_STATUSES } from '../types'

export const createTicketSchema = z.object({
  title: z.string().min(1, 'Title is required').max(100),
  description: z.string().min(1, 'Description is required'),
  status: z.enum(TICKET_STATUSES).optional().default('open'),
  priority: z.enum(TICKET_PRIORITIES).optional().default('medium'),
  metadata: z.record(z.unknown()).optional().default({})
})

export const updateTicketSchema = z.object({
  id: z.string().uuid('Invalid ticket ID'),
  title: z.string().min(1).max(100).optional(),
  description: z.string().optional(),
  status: z.enum(TICKET_STATUSES).optional(),
  priority: z.enum(TICKET_PRIORITIES).optional(),
  metadata: z.record(z.unknown()).optional()
}) 