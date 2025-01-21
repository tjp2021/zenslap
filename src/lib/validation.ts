import { z } from 'zod'
import { TICKET_PRIORITIES, TICKET_STATUSES, TicketStatus, TicketPriority } from './types'

// Base schemas for reuse
const uuidSchema = z.string().uuid({ message: 'Invalid UUID format' })
const timestampSchema = z.string().datetime({ message: 'Invalid timestamp format' })

// Tag validation schemas
export const tagSchema = z.object({
    id: uuidSchema,
    name: z.string()
        .min(1, 'Tag name is required')
        .max(50, 'Tag name cannot exceed 50 characters'),
    color: z.string()
        .regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid color format - use hex format (e.g. #FF0000)')
        .optional(),
    created_at: timestampSchema
})

export const createTagSchema = tagSchema.omit({ 
    id: true, 
    created_at: true 
})

// Internal note validation schemas
export const internalNoteSchema = z.object({
    id: uuidSchema,
    ticket_id: uuidSchema,
    content: z.string()
        .min(1, 'Note content is required')
        .max(10000, 'Note content cannot exceed 10000 characters'),
    created_by: uuidSchema,
    created_at: timestampSchema,
    updated_at: timestampSchema
})

export const createInternalNoteSchema = z.object({
    ticket_id: uuidSchema,
    content: z.string()
        .min(1, 'Note content is required')
        .max(10000, 'Note content cannot exceed 10000 characters')
})

// Ticket message validation schemas
export const ticketMessageSchema = z.object({
    id: uuidSchema,
    ticket_id: uuidSchema,
    content: z.string()
        .min(1, 'Message content is required')
        .max(10000, 'Message content cannot exceed 10000 characters'),
    type: z.enum(['customer', 'agent'], {
        errorMap: () => ({ message: 'Message type must be either customer or agent' })
    }),
    created_by: uuidSchema,
    created_at: timestampSchema
})

export const createTicketMessageSchema = z.object({
    ticket_id: uuidSchema,
    content: z.string()
        .min(1, 'Message content is required')
        .max(10000, 'Message content cannot exceed 10000 characters'),
    type: z.enum(['customer', 'agent'])
})

// Updated ticket validation schemas
export const ticketSchema = z.object({
    id: uuidSchema,
    title: z.string()
        .min(1, 'Title is required')
        .max(200, 'Title cannot exceed 200 characters'),
    description: z.string()
        .min(1, 'Description is required')
        .max(10000, 'Description cannot exceed 10000 characters'),
    status: z.custom<TicketStatus>((val) => TICKET_STATUSES.includes(val as any), {
        message: 'Invalid ticket status'
    }),
    priority: z.custom<TicketPriority>((val) => TICKET_PRIORITIES.includes(val as any), {
        message: 'Invalid ticket priority'
    }),
    metadata: z.record(z.any()).optional(),
    tags: z.array(tagSchema).optional(),
    assignee: uuidSchema.nullable().optional(),
    created_by: uuidSchema,
    created_at: timestampSchema,
    updated_at: timestampSchema,
    messages: z.array(ticketMessageSchema).optional(),
    internal_notes: z.array(internalNoteSchema).optional()
})

export const createTicketSchema = z.object({
    title: z.string()
        .min(1, 'Title is required')
        .max(200, 'Title cannot exceed 200 characters'),
    description: z.string()
        .min(1, 'Description is required')
        .max(10000, 'Description cannot exceed 10000 characters'),
    status: z.custom<TicketStatus>((val) => TICKET_STATUSES.includes(val as any), {
        message: 'Invalid ticket status'
    }).optional(),
    priority: z.custom<TicketPriority>((val) => TICKET_PRIORITIES.includes(val as any), {
        message: 'Invalid ticket priority'
    }).optional(),
    metadata: z.record(z.any()).optional(),
    tags: z.array(uuidSchema).optional(),
    assignee: uuidSchema.nullable().optional()
})

export const updateTicketSchema = createTicketSchema
    .partial()
    .extend({ id: uuidSchema })

// Response schemas
export const ticketResponseSchema = z.object({
  data: ticketSchema.nullable(),
  error: z.string().nullable()
})

export const ticketsResponseSchema = z.object({
  data: z.array(ticketSchema),
  error: z.string().nullable()
}) 