import { createMockSupabaseClient } from '@/lib/context/__tests__/test-utils'
import { tickets } from '../routes/tickets'
import { mockTicket } from '../../test-utils'

const VALID_UUID = '123e4567-e89b-12d3-a456-426614174000'

describe('Ticket Service', () => {
	let mockSupabase: any

	beforeEach(() => {
		mockSupabase = createMockSupabaseClient({
			select: { data: null, error: null },
			insert: { data: null, error: null },
			update: { data: null, error: null },
			delete: { data: null, error: null }
		})
	})

	describe('create', () => {
		it('should create a ticket successfully', async () => {
			mockSupabase.mockMethods.insert.mockResolvedValueOnce({
				data: { ...mockTicket, id: VALID_UUID },
				error: null
			})

			const result = await tickets.create({
				title: 'Test Ticket',
				description: 'Test Description',
				status: 'open',
				priority: 'medium',
				metadata: {}
			}, mockSupabase)

			expect(result.data).toEqual({ ...mockTicket, id: VALID_UUID })
			expect(result.error).toBeNull()
		})

		it('should handle database errors', async () => {
			mockSupabase.mockMethods.insert.mockRejectedValueOnce(new Error('Database error'))

			const result = await tickets.create({
				title: 'Test Ticket',
				description: 'Test Description',
				status: 'open',
				priority: 'medium',
				metadata: {}
			}, mockSupabase)

			expect(result.data).toBeNull()
			expect(result.error).toEqual(new Error('Database error'))
		})

		it('should handle empty title', async () => {
			const result = await tickets.create({
				title: '',
				description: 'Test Description',
				status: 'open',
				priority: 'medium',
				metadata: {}
			}, mockSupabase)

			expect(result.data).toBeNull()
			expect(result.error).toEqual(new Error('Title is required'))
		})

		it('should handle very long title', async () => {
			const result = await tickets.create({
				title: 'a'.repeat(256),
				description: 'Test Description',
				status: 'open',
				priority: 'medium',
				metadata: {}
			}, mockSupabase)

			expect(result.data).toBeNull()
			expect(result.error).toEqual(new Error('Title must be at most 255 characters'))
		})

		it('should handle invalid status', async () => {
			const result = await tickets.create({
				title: 'Test Ticket',
				description: 'Test Description',
				status: 'invalid_status',
				priority: 'medium',
				metadata: {}
			} as any, mockSupabase)

			expect(result.data).toBeNull()
			expect(result.error).toEqual(new Error('Invalid status value'))
		})

		it('should handle invalid priority', async () => {
			const result = await tickets.create({
				title: 'Test Ticket',
				description: 'Test Description',
				status: 'open',
				priority: 'invalid_priority',
				metadata: {}
			} as any, mockSupabase)

			expect(result.data).toBeNull()
			expect(result.error).toEqual(new Error('Invalid priority value'))
		})
	})

	describe('getAll', () => {
		it('should get all tickets successfully', async () => {
			mockSupabase.mockMethods.select.mockResolvedValueOnce({
				data: [mockTicket],
				error: null
			})

			const result = await tickets.getAll(mockSupabase)
			expect(result.data).toEqual([mockTicket])
			expect(result.error).toBeNull()
		})

		it('should handle database errors', async () => {
			mockSupabase.mockMethods.select.mockRejectedValueOnce(new Error('Database error'))

			const result = await tickets.getAll(mockSupabase)
			expect(result.data).toBeNull()
			expect(result.error).toEqual(new Error('Database error'))
		})
	})

	describe('getById', () => {
		it('should get a ticket by id successfully', async () => {
			mockSupabase.mockMethods.select.mockResolvedValueOnce({
				data: { ...mockTicket, id: VALID_UUID },
				error: null
			})

			const result = await tickets.getById(VALID_UUID, mockSupabase)
			expect(result.data).toEqual({ ...mockTicket, id: VALID_UUID })
			expect(result.error).toBeNull()
		})

		it('should handle empty id', async () => {
			const result = await tickets.getById('', mockSupabase)
			expect(result.data).toBeNull()
			expect(result.error).toEqual(new Error('Ticket ID is required'))
		})

		it('should handle invalid id format', async () => {
			const result = await tickets.getById('invalid-id', mockSupabase)
			expect(result.data).toBeNull()
			expect(result.error).toEqual(new Error('Invalid ticket ID format'))
		})

		it('should handle non-existent ticket', async () => {
			mockSupabase.mockMethods.select.mockResolvedValueOnce({
				data: null,
				error: null
			})

			const result = await tickets.getById(VALID_UUID, mockSupabase)
			expect(result.data).toBeNull()
			expect(result.error).toEqual(new Error('Ticket not found'))
		})

		it('should handle database errors', async () => {
			mockSupabase.mockMethods.select.mockRejectedValueOnce(new Error('Database error'))

			const result = await tickets.getById(VALID_UUID, mockSupabase)
			expect(result.data).toBeNull()
			expect(result.error).toEqual(new Error('Database error'))
		})
	})

	describe('update', () => {
		it('should update a ticket successfully', async () => {
			mockSupabase.mockMethods.update.mockResolvedValueOnce({
				data: { ...mockTicket, id: VALID_UUID },
				error: null
			})

			const result = await tickets.update(VALID_UUID, {
				id: VALID_UUID,
				title: 'Updated Title'
			}, mockSupabase)

			expect(result.data).toEqual({ ...mockTicket, id: VALID_UUID })
			expect(result.error).toBeNull()
		})

		it('should handle empty id', async () => {
			const result = await tickets.update('', {
				id: '',
				title: 'Updated Title'
			}, mockSupabase)

			expect(result.data).toBeNull()
			expect(result.error).toEqual(new Error('Ticket ID is required'))
		})

		it('should handle invalid id format', async () => {
			const result = await tickets.update('invalid-id', {
				id: 'invalid-id',
				title: 'Updated Title'
			}, mockSupabase)

			expect(result.data).toBeNull()
			expect(result.error).toEqual(new Error('Invalid uuid'))
		})

		it('should handle non-existent ticket', async () => {
			mockSupabase.mockMethods.update.mockResolvedValueOnce({
				data: null,
				error: null
			})

			const result = await tickets.update(VALID_UUID, {
				id: VALID_UUID,
				title: 'Updated Title'
			}, mockSupabase)

			expect(result.data).toBeNull()
			expect(result.error).toEqual(new Error('Ticket not found'))
		})

		it('should handle database errors', async () => {
			mockSupabase.mockMethods.update.mockRejectedValueOnce(new Error('Database error'))

			const result = await tickets.update(VALID_UUID, {
				id: VALID_UUID,
				title: 'Updated Title'
			}, mockSupabase)

			expect(result.data).toBeNull()
			expect(result.error).toEqual(new Error('Database error'))
		})
	})

	describe('delete', () => {
		it('should delete a ticket successfully', async () => {
			mockSupabase.mockMethods.delete.mockResolvedValueOnce({
				data: null,
				error: null
			})

			const result = await tickets.delete(VALID_UUID, mockSupabase)
			expect(result.data).toEqual({ success: true })
			expect(result.error).toBeNull()
		})

		it('should handle empty id', async () => {
			const result = await tickets.delete('', mockSupabase)
			expect(result.data).toBeNull()
			expect(result.error).toEqual(new Error('Ticket ID is required'))
		})

		it('should handle invalid id format', async () => {
			const result = await tickets.delete('invalid-id', mockSupabase)
			expect(result.data).toBeNull()
			expect(result.error).toEqual(new Error('Invalid uuid'))
		})

		it('should handle database errors', async () => {
			mockSupabase.mockMethods.delete.mockRejectedValueOnce(new Error('Database error'))

			const result = await tickets.delete(VALID_UUID, mockSupabase)
			expect(result.data).toBeNull()
			expect(result.error).toEqual(new Error('Database error'))
		})
	})
}) 