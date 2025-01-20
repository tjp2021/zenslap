import { handleCreateTicket, handleUpdateTicket } from '../routes/tickets'
import { TicketPriority, TicketStatus } from '@/lib/types'

describe('Ticket API Routes', () => {
	let mockSupabase: any
	let mockReq: any
	let mockRes: any

	beforeEach(() => {
		// Reset mocks
		mockSupabase = {
			from: jest.fn(() => mockSupabase),
			insert: jest.fn(() => mockSupabase),
			update: jest.fn(() => mockSupabase),
			select: jest.fn(() => mockSupabase),
			single: jest.fn(() => mockSupabase),
			eq: jest.fn(() => mockSupabase)
		}

		mockReq = {
			body: {},
			query: {}
		}

		mockRes = {
			status: jest.fn(() => mockRes),
			json: jest.fn()
		}
	})

	describe('createTicket', () => {
		it('creates a ticket with required fields', async () => {
			const ticketData = {
				title: 'Test Ticket',
				description: 'Test Description',
				priority: TicketPriority.MEDIUM
			}

			mockReq.body = ticketData
			mockSupabase.single.mockResolvedValue({
				data: { ...ticketData, id: 1 },
				error: null
			})

			await handleCreateTicket(mockReq, mockRes, mockSupabase)

			expect(mockSupabase.from).toHaveBeenCalledWith('tickets')
			expect(mockSupabase.insert).toHaveBeenCalledWith({
				...ticketData,
				status: TicketStatus.OPEN,
				created_at: expect.any(String),
				updated_at: expect.any(String)
			})
		})

		it('handles errors during ticket creation', async () => {
			// Use a Supabase-like error structure
			const error = {
				message: 'Database error',
				code: 'INTERNAL_ERROR'
			}
			
			mockSupabase.single.mockResolvedValue({ error })

			try {
				await handleCreateTicket(mockReq, mockRes, mockSupabase)
			} catch (err) {
				expect(err).toEqual(error)
			}

			expect(mockSupabase.from).toHaveBeenCalledWith('tickets')
			expect(mockSupabase.insert).toHaveBeenCalled()
		})
	})

	describe('updateTicket', () => {
		it('updates a ticket with valid data', async () => {
			const ticketId = '123'
			const updateData = {
				status: TicketStatus.IN_PROGRESS,
				priority: TicketPriority.HIGH
			}

			mockReq.query.id = ticketId
			mockReq.body = updateData
			mockSupabase.single.mockResolvedValue({
				data: { id: ticketId, ...updateData },
				error: null
			})

			await handleUpdateTicket(mockReq, mockRes, mockSupabase)

			expect(mockSupabase.from).toHaveBeenCalledWith('tickets')
			expect(mockSupabase.update).toHaveBeenCalledWith({
				...updateData,
				updated_at: expect.any(String)
			})
			expect(mockSupabase.eq).toHaveBeenCalledWith('id', ticketId)
		})

		it('handles missing ticket ID', async () => {
			mockReq.query = {}
			await handleUpdateTicket(mockReq, mockRes, mockSupabase)

			expect(mockRes.status).toHaveBeenCalledWith(400)
			expect(mockRes.json).toHaveBeenCalledWith({
				error: 'Missing ticket ID'
			})
		})
	})
}) 