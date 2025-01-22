import { z } from 'zod'
import { TICKET_PRIORITIES, TICKET_STATUSES } from '../types'
import { ACTIVITY_TYPES, type ActivityType, type ActivityContent } from '../types/activities'

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

const commentContentSchema = z.object({
  message: z.string().min(1, 'Message is required'),
  format: z.literal('text')
}) satisfies z.ZodType<ActivityContent['comment']>

const statusChangeContentSchema = z.object({
  from: z.enum(TICKET_STATUSES),
  to: z.enum(TICKET_STATUSES)
}) satisfies z.ZodType<ActivityContent['status_change']>

const fieldChangeContentSchema = z.object({
  field: z.string(),
  from: z.string(),
  to: z.string()
}) satisfies z.ZodType<ActivityContent['field_change']>

const assignmentContentSchema = z.object({
  from: z.string().uuid().nullable(),
  to: z.string().uuid().nullable()
}) satisfies z.ZodType<ActivityContent['assignment']>

export const createActivitySchema = z.object({
  ticket_id: z.string().uuid('Invalid ticket ID'),
  activity_type: z.nativeEnum(ACTIVITY_TYPES),
  content: z.discriminatedUnion('activity_type', [
    z.object({ activity_type: z.literal(ACTIVITY_TYPES.COMMENT), content: commentContentSchema }),
    z.object({ activity_type: z.literal(ACTIVITY_TYPES.STATUS_CHANGE), content: statusChangeContentSchema }),
    z.object({ activity_type: z.literal(ACTIVITY_TYPES.FIELD_CHANGE), content: fieldChangeContentSchema }),
    z.object({ activity_type: z.literal(ACTIVITY_TYPES.ASSIGNMENT), content: assignmentContentSchema })
  ]).transform(data => data.content)
})

export const ticketActivitySchema = z.object({
  id: z.string().uuid(),
  ticket_id: z.string().uuid(),
  actor_id: z.string().uuid().nullable(),
  activity_type: z.nativeEnum(ACTIVITY_TYPES),
  content: z.union([
    commentContentSchema,
    statusChangeContentSchema,
    fieldChangeContentSchema,
    assignmentContentSchema
  ]),
  created_at: z.string().datetime()
})

export const ticketActivityResponseSchema = z.object({
  data: z.array(ticketActivitySchema).nullable(),
  error: z.string().nullable()
}) 