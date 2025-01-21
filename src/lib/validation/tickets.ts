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

const ACTIVITY_TYPES = ['comment', 'note', 'status_change', 'field_change'] as const

const commentContentSchema = z.object({
  message: z.string().min(1, 'Message is required'),
  format: z.literal('text')
})

const noteContentSchema = z.object({
  message: z.string().min(1, 'Message is required'),
  format: z.literal('text')
})

const statusChangeContentSchema = z.object({
  from: z.enum(TICKET_STATUSES),
  to: z.enum(TICKET_STATUSES)
})

const fieldChangeContentSchema = z.object({
  field: z.string(),
  from: z.string(),
  to: z.string()
})

export const createActivitySchema = z.object({
  ticket_id: z.string().uuid('Invalid ticket ID'),
  activity_type: z.enum(ACTIVITY_TYPES),
  is_internal: z.boolean().optional().default(false),
  parent_id: z.string().uuid('Invalid parent activity ID').optional(),
  content: z.discriminatedUnion('activity_type', [
    z.object({ activity_type: z.literal('comment'), content: commentContentSchema }),
    z.object({ activity_type: z.literal('note'), content: noteContentSchema }),
    z.object({ activity_type: z.literal('status_change'), content: statusChangeContentSchema }),
    z.object({ activity_type: z.literal('field_change'), content: fieldChangeContentSchema })
  ]).transform(data => data.content)
}) 