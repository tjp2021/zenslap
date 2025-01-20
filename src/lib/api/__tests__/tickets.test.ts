// Mock setup must be before imports
jest.mock('../utils', () => {
	interface MockMethods {
		insert: jest.Mock
		select: jest.Mock
		update: jest.Mock
		delete: jest.Mock
		eq: jest.Mock
		order: jest.Mock
		single: jest.Mock
	}

	const mockMethods: MockMethods = {
		insert: jest.fn(() => mockMethods),
		select: jest.fn(() => mockMethods),
		update: jest.fn(() => mockMethods),
		delete: jest.fn(() => mockMethods),
		eq: jest.fn(() => mockMethods),
		order: jest.fn(() => ({ data: [], error: null })),
		single: jest.fn(() => ({ data: null, error: null }))
	}

	const actual = jest.requireActual('../utils')
	return {
		...actual,
		supabase: {
			from: jest.fn(() => mockMethods)
		},
		handleError: jest.fn((error: unknown) => {
			if (error instanceof Error) return error.message
			if (error && typeof error === 'object' && 'message' in error) {
				return String(error.message)
			}
			return String(error)
		}),
		isUUIDError: jest.fn((error: unknown) => {
			if (error && typeof error === 'object' && 'message' in error) {
				return String(error.message).includes('invalid input syntax for type uuid')
			}
			return false
		})
	}
})

// Imports must come after mock
import { ticketService } from '../routes/tickets'
import { supabase } from '../utils'
import { expectErrorResponse, expectSuccessResponse, createMockTicket, createMockTicketDTO } from '../../test-utils'
import type { TicketStatus, TicketPriority } from '../../types'

// Mock valid UUIDs for testing
const VALID_UUID = '123e4567-e89b-12d3-a456-426614174000'
const VALID_UUID_2 = '987fcdeb-51a2-43e7-9876-543210987000'

// Get mock methods for use in tests
const mockMethods = (supabase.from as jest.Mock)()

describe('Ticket Service', () => {
	const validTicket = createMockTicketDTO()

	beforeEach(() => {
		jest.clearAllMocks()
		
		// Reset default mock return values
		mockMethods.single.mockImplementation(() => ({ data: null, error: null }))
		mockMethods.order.mockImplementation(() => ({ data: [], error: null }))

		// Reset method chaining
		mockMethods.insert.mockImplementation(() => mockMethods)
		mockMethods.select.mockImplementation(() => mockMethods)
		mockMethods.update.mockImplementation(() => mockMethods)
		mockMethods.delete.mockImplementation(() => mockMethods)
		mockMethods.eq.mockImplementation(() => mockMethods)
	})

	describe('create', () => {
		it('should create a ticket successfully', async () => {
			const expectedTicket = createMockTicket({
				id: '123',
				created_at: '2025-01-20T21:05:10.183Z',
				updated_at: '2025-01-20T21:05:10.183Z'
			})

			// Set up the method chain
			mockMethods.insert.mockImplementation(() => mockMethods)
			mockMethods.select.mockImplementation(() => mockMethods)
			mockMethods.single.mockImplementation(() => ({ 
				data: expectedTicket,
				error: null 
			}))
			
			const result = await ticketService.create(validTicket)
			
			// Verify the result
			expectSuccessResponse(result, expectedTicket)
			
			// Verify the method chain was called correctly
			expect(mockMethods.insert).toHaveBeenCalledWith(validTicket)
			expect(mockMethods.select).toHaveBeenCalled()
			expect(mockMethods.single).toHaveBeenCalled()
		})

		it('should handle database errors', async () => {
			mockMethods.insert.mockImplementation(() => mockMethods)
			mockMethods.select.mockImplementation(() => mockMethods)
			mockMethods.single.mockImplementation(() => ({ 
				data: null, 
				error: new Error('Database error')
			}))
			
			const result = await ticketService.create(validTicket)
			
			expectErrorResponse(result, 'Database error')
		})

		it('should handle empty title', async () => {
			const result = await ticketService.create(createMockTicketDTO({ title: '' }))
			
			expectErrorResponse(result, 'Title is required')
		})

		it('should handle very long title', async () => {
			const result = await ticketService.create(createMockTicketDTO({ title: 'a'.repeat(256) }))
			
			expectErrorResponse(result, 'Title must be at most 255 characters')
		})

		it('should handle invalid status', async () => {
			const result = await ticketService.create(createMockTicketDTO({ 
				status: 'invalid_status' as TicketStatus 
			}))
			
			expectErrorResponse(result, 'Invalid status value')
		})

		it('should handle invalid priority', async () => {
			const result = await ticketService.create(createMockTicketDTO({ 
				priority: 'invalid_priority' as TicketPriority 
			}))
			
			expectErrorResponse(result, 'Invalid priority value')
		})
	})

	describe('getAll', () => {
		it('should get all tickets successfully', async () => {
			const expectedTickets = [createMockTicket()]
			mockMethods.select.mockImplementation(() => mockMethods)
			mockMethods.order.mockImplementation(() => ({ 
				data: expectedTickets,
				error: null 
			}))
			
			const result = await ticketService.getAll()
			
			expectSuccessResponse(result, expectedTickets)
			expect(mockMethods.select).toHaveBeenCalledWith('*')
			expect(mockMethods.order).toHaveBeenCalledWith('created_at', { ascending: false })
		})

		it('should handle database errors', async () => {
			mockMethods.select.mockImplementation(() => mockMethods)
			mockMethods.order.mockImplementation(() => ({ 
				data: null,
				error: new Error('Database error')
			}))
			
			const result = await ticketService.getAll()
			
			expect(result.data).toEqual([])
			expect(result.error).toBe('Database error')
		})
	})

	describe('getById', () => {
		it('should get a ticket by id successfully', async () => {
			const expectedTicket = createMockTicket()
			mockMethods.select.mockImplementation(() => mockMethods)
			mockMethods.eq.mockImplementation(() => mockMethods)
			mockMethods.single.mockImplementation(() => ({ 
				data: expectedTicket,
				error: null 
			}))
			
			const result = await ticketService.getById(VALID_UUID)
			
			expectSuccessResponse(result, expectedTicket)
			expect(mockMethods.select).toHaveBeenCalledWith('*')
			expect(mockMethods.eq).toHaveBeenCalledWith('id', VALID_UUID)
		})

		it('should handle empty id', async () => {
			const result = await ticketService.getById('')
			
			expectErrorResponse(result, 'Ticket ID is required')
		})

		it('should handle invalid id format', async () => {
			mockMethods.select.mockImplementation(() => mockMethods)
			mockMethods.eq.mockImplementation(() => mockMethods)
			mockMethods.single.mockImplementation(() => ({ 
				data: null,
				error: { message: 'invalid input syntax for type uuid: "invalid-id"' }
			}))
			
			const result = await ticketService.getById('invalid-id')
			
			expectErrorResponse(result, 'Invalid ticket ID format')
		})

		it('should handle database errors', async () => {
			mockMethods.select.mockImplementation(() => mockMethods)
			mockMethods.eq.mockImplementation(() => mockMethods)
			mockMethods.single.mockImplementation(() => ({ 
				data: null,
				error: new Error('Database error')
			}))
			
			const result = await ticketService.getById(VALID_UUID)
			
			expectErrorResponse(result, 'Database error')
		})

		it('should handle non-existent ticket', async () => {
			mockMethods.select.mockImplementation(() => mockMethods)
			mockMethods.eq.mockImplementation(() => mockMethods)
			mockMethods.single.mockImplementation(() => ({ data: null, error: null }))
			
			const result = await ticketService.getById(VALID_UUID)
			
			expectErrorResponse(result, 'Ticket not found')
			expect(mockMethods.select).toHaveBeenCalledWith('*')
		})
	})

	describe('update', () => {
		const validUpdate = {
			id: VALID_UUID,
			title: 'Updated Title'
		}

		it('should update a ticket successfully', async () => {
			const updatedTicket = createMockTicket({ ...validUpdate })
			mockMethods.update.mockImplementation(() => mockMethods)
			mockMethods.eq.mockImplementation(() => mockMethods)
			mockMethods.select.mockImplementation(() => mockMethods)
			mockMethods.single.mockImplementation(() => ({ 
				data: updatedTicket,
				error: null 
			}))
			
			const result = await ticketService.update(validUpdate)
			
			expectSuccessResponse(result, updatedTicket)
			expect(mockMethods.update).toHaveBeenCalledWith({ title: 'Updated Title' })
			expect(mockMethods.eq).toHaveBeenCalledWith('id', VALID_UUID)
		})

		it('should handle invalid id format', async () => {
			const invalidId = 'invalid-id'
			
			const result = await ticketService.update({ ...validUpdate, id: invalidId })
			
			expect(result.data).toBeNull()
			expect(result.error).toBe('Invalid uuid')
		})

		it('should handle database errors', async () => {
			mockMethods.update.mockImplementation(() => mockMethods)
			mockMethods.eq.mockImplementation(() => mockMethods)
			mockMethods.select.mockImplementation(() => mockMethods)
			mockMethods.single.mockImplementation(() => ({ 
				data: null,
				error: new Error('Database error')
			}))
			
			const result = await ticketService.update(validUpdate)
			
			expectErrorResponse(result, 'Database error')
		})

		it('should handle non-existent ticket', async () => {
			mockMethods.update.mockImplementation(() => mockMethods)
			mockMethods.eq.mockImplementation(() => mockMethods)
			mockMethods.select.mockImplementation(() => mockMethods)
			mockMethods.single.mockImplementation(() => ({ data: null, error: null }))
			
			const result = await ticketService.update(validUpdate)
			
			expectErrorResponse(result, 'Ticket not found')
		})
	})

	describe('delete', () => {
		it('should delete a ticket successfully', async () => {
			mockMethods.delete.mockImplementation(() => mockMethods)
			mockMethods.eq.mockImplementation(() => ({ error: null }))
			
			const result = await ticketService.delete(VALID_UUID)
			
			expect(result.data).toBe(true)
			expect(result.error).toBeNull()
			expect(mockMethods.delete).toHaveBeenCalled()
			expect(mockMethods.eq).toHaveBeenCalledWith('id', VALID_UUID)
		})

		it('should handle empty id', async () => {
			const result = await ticketService.delete('')
			
			expect(result.data).toBe(false)
			expect(result.error).toBe('Ticket ID is required')
		})

		it('should handle invalid id format', async () => {
			mockMethods.delete.mockImplementation(() => mockMethods)
			mockMethods.eq.mockImplementation(() => ({ 
				error: { message: 'invalid input syntax for type uuid: "invalid-id"' }
			}))
			
			const result = await ticketService.delete('invalid-id')
			
			expect(result.data).toBe(false)
			expect(result.error).toBe('Invalid ticket ID format')
		})

		it('should handle database errors', async () => {
			mockMethods.delete.mockImplementation(() => mockMethods)
			mockMethods.eq.mockImplementation(() => ({ error: new Error('Database error') }))
			
			const result = await ticketService.delete(VALID_UUID)
			
			expect(result.data).toBe(false)
			expect(result.error).toBe('Database error')
		})
	})
}) 