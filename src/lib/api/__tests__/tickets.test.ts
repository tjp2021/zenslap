import { createMockSupabaseClient } from '@/lib/context/__tests__/test-utils'
import { create, getAll, getById, update, deleteTicket } from '../routes/tickets'
import { mockTicket } from '../../test-utils'
import { SupabaseClient } from '@supabase/supabase-js'
import type { CreateTicketDTO, UpdateTicketDTO } from '../routes/tickets'

const VALID_UUID = '123e4567-e89b-12d3-a456-426614174000'

const mockCreateTicket: CreateTicketDTO = {
	title: 'Test Ticket',
	description: 'Test Description',
	status: 'open' as const,
	priority: 'medium' as const,
	metadata: {},
	tags: []
}

const mockUpdateTicket: UpdateTicketDTO = {
	id: VALID_UUID,
	title: 'Updated Title',
	status: 'closed' as const
}

const mockSupabase = createMockSupabaseClient()

describe('Ticket Service', () => {
	describe('create', () => {
		it('should create a ticket successfully', async () => {
			const result = await create(mockCreateTicket, mockSupabase as any as SupabaseClient)
			expect(result.data).toEqual({
				...mockTicket,
				id: VALID_UUID,
				created_at: expect.any(String),
				updated_at: expect.any(String)
			})
			expect(result.error).toBeNull()
		})

		it('should handle database errors', async () => {
			const result = await create({
				title: 'Test Ticket',
				description: 'Test Description',
				status: 'open' as const,
				priority: 'high' as const,
				metadata: {},
				tags: []
			}, mockSupabase as any as SupabaseClient)

			expect(result.data).toBeNull()
			expect(result.error).toEqual({
				message: 'Database error',
				details: '',
				hint: '',
				code: 'PGRST116'
			})
		})

		it('should handle empty title', async () => {
			const result = await create({
				title: '',
				description: 'Test Description',
				status: 'open' as const,
				priority: 'medium' as const,
				metadata: {},
				tags: []
			}, mockSupabase as any as SupabaseClient)

			expect(result.data).toBeNull()
			expect(result.error).toEqual({
				message: 'Title is required',
				details: '',
				hint: '',
				code: 'VALIDATION_ERROR'
			})
		})

		it('should handle very long title', async () => {
			const result = await create({
				title: 'a'.repeat(256),
				description: 'Test Description',
				status: 'open' as const,
				priority: 'medium' as const,
				metadata: {},
				tags: []
			}, mockSupabase as any as SupabaseClient)

			expect(result.data).toBeNull()
			expect(result.error).toEqual(new Error('Title must be at most 255 characters'))
		})

		it('should handle invalid status', async () => {
			const result = await create({
				title: 'Test Ticket',
				description: 'Test Description',
				status: 'invalid_status' as const,
				priority: 'medium' as const,
				metadata: {},
				tags: []
			} as any, mockSupabase as any as SupabaseClient)

			expect(result.data).toBeNull()
			expect(result.error).toEqual(new Error('Invalid status value'))
		})

		it('should handle invalid priority', async () => {
			const result = await create({
				title: 'Test Ticket',
				description: 'Test Description',
				status: 'open' as const,
				priority: 'invalid_priority' as const,
				metadata: {},
				tags: []
			} as any, mockSupabase as any as SupabaseClient)

			expect(result.data).toBeNull()
			expect(result.error).toEqual(new Error('Invalid priority value'))
		})
	})

	describe('getAll', () => {
		it('should get all tickets successfully', async () => {
			const result = await getAll(mockSupabase as any as SupabaseClient)
			expect(result.data).toEqual([mockTicket])
			expect(result.error).toBeNull()
		})

		it('should handle database errors', async () => {
			const result = await getAll(mockSupabase as any as SupabaseClient)

			expect(result.data).toBeNull()
			expect(result.error).toEqual({
				message: 'Database error',
				details: '',
				hint: '',
				code: 'PGRST116'
			})
		})
	})

	describe('getById', () => {
		it('should get a ticket by id successfully', async () => {
			const result = await getById(VALID_UUID, mockSupabase as any as SupabaseClient)
			expect(result.data).toEqual({ ...mockTicket, id: VALID_UUID })
			expect(result.error).toBeNull()
		})

		it('should handle missing id', async () => {
			const result = await getById('', mockSupabase as any as SupabaseClient)

			expect(result.data).toBeNull()
			expect(result.error).toEqual({
				message: 'Ticket ID is required',
				details: '',
				hint: '',
				code: 'VALIDATION_ERROR'
			})
		})

		it('should handle invalid id format', async () => {
			const result = await getById('invalid-id', mockSupabase as any as SupabaseClient)

			expect(result.data).toBeNull()
			expect(result.error).toEqual({
				message: 'Invalid ticket ID format',
				details: '',
				hint: '',
				code: 'VALIDATION_ERROR'
			})
		})

		it('should handle non-existent ticket', async () => {
			const result = await getById(VALID_UUID, mockSupabase as any as SupabaseClient)

			expect(result.data).toBeNull()
			expect(result.error).toEqual({
				message: 'Ticket not found',
				details: '',
				hint: '',
				code: 'PGRST116'
			})
		})

		it('should handle database errors', async () => {
			const result = await getById(VALID_UUID, mockSupabase as any as SupabaseClient)

			expect(result.data).toBeNull()
			expect(result.error).toEqual({
				message: 'Database error',
				details: '',
				hint: '',
				code: 'PGRST116'
			})
		})
	})

	describe('update', () => {
		it('should update a ticket successfully', async () => {
			const result = await update(VALID_UUID, mockUpdateTicket, mockSupabase as any as SupabaseClient)
			expect(result.data).toEqual({
				...mockTicket
			})
			expect(result.error).toBeNull()
		})

		it('should handle missing id', async () => {
			const result = await update('', mockUpdateTicket, mockSupabase as any as SupabaseClient)

			expect(result.data).toBeNull()
			expect(result.error).toEqual({
				message: 'Ticket ID is required',
				details: '',
				hint: '',
				code: 'VALIDATION_ERROR'
			})
		})

		it('should handle invalid id format', async () => {
			const result = await update('invalid-id', mockUpdateTicket, mockSupabase as any as SupabaseClient)

			expect(result.data).toBeNull()
			expect(result.error).toEqual({
				message: 'Invalid uuid',
				details: '',
				hint: '',
				code: 'VALIDATION_ERROR'
			})
		})

		it('should handle non-existent ticket', async () => {
			const result = await update(VALID_UUID, mockUpdateTicket, mockSupabase as any as SupabaseClient)

			expect(result.data).toBeNull()
			expect(result.error).toEqual({
				message: 'Ticket not found',
				details: '',
				hint: '',
				code: 'PGRST116'
			})
		})

		it('should handle database errors', async () => {
			const result = await update(VALID_UUID, mockUpdateTicket, mockSupabase as any as SupabaseClient)

			expect(result.data).toBeNull()
			expect(result.error).toEqual({
				message: 'Database error',
				details: '',
				hint: '',
				code: 'PGRST116'
			})
		})
	})

	describe('delete', () => {
		it('should delete a ticket successfully', async () => {
			const result = await deleteTicket(VALID_UUID, mockSupabase as any as SupabaseClient)
			expect(result.data).toEqual({ success: true })
			expect(result.error).toBeNull()
		})

		it('should handle missing id', async () => {
			const result = await deleteTicket('', mockSupabase as any as SupabaseClient)

			expect(result.data).toBeNull()
			expect(result.error).toEqual({
				message: 'Ticket ID is required',
				details: '',
				hint: '',
				code: 'VALIDATION_ERROR'
			})
		})

		it('should handle invalid id format', async () => {
			const result = await deleteTicket('invalid-id', mockSupabase as any as SupabaseClient)

			expect(result.data).toBeNull()
			expect(result.error).toEqual({
				message: 'Invalid uuid',
				details: '',
				hint: '',
				code: 'VALIDATION_ERROR'
			})
		})

		it('should handle database errors', async () => {
			const result = await deleteTicket(VALID_UUID, mockSupabase as any as SupabaseClient)

			expect(result.data).toBeNull()
			expect(result.error).toEqual({
				message: 'Database error',
				details: '',
				hint: '',
				code: 'PGRST116'
			})
		})
	})
}) 