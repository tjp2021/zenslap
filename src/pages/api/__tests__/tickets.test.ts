import { createMockRouter } from '@/lib/test-utils'
import handler from '../tickets'
import { ticketService } from '@/lib/api/routes/tickets'
import { createMockTicket, createMockTicketDTO } from '@/lib/test-utils'

// Mock ticket service
jest.mock('@/lib/api/routes/tickets', () => ({
  ticketService: {
    create: jest.fn(),
    getAll: jest.fn(),
    getById: jest.fn(),
    update: jest.fn(),
    delete: jest.fn()
  }
}))

describe('Tickets API', () => {
  const mockTicket = createMockTicket()
  const mockCreateTicket = createMockTicketDTO()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET /api/tickets', () => {
    it('should return all tickets', async () => {
      const { req, res } = createMockRouter({
        method: 'GET'
      })

      // Mock service response
      ;(ticketService.getAll as jest.Mock).mockResolvedValue({
        data: [mockTicket],
        error: null
      })

      await handler(req, res)

      expect(res.status).toHaveBeenCalledWith(200)
      expect(res.json).toHaveBeenCalledWith({
        data: [mockTicket]
      })
    })

    it('should handle errors', async () => {
      const { req, res } = createMockRouter({
        method: 'GET'
      })

      const error = 'Failed to fetch tickets'
      ;(ticketService.getAll as jest.Mock).mockResolvedValue({
        data: null,
        error
      })

      await handler(req, res)

      expect(res.status).toHaveBeenCalledWith(500)
      expect(res.json).toHaveBeenCalledWith({ error })
    })
  })

  describe('POST /api/tickets', () => {
    it('should create a new ticket', async () => {
      const { req, res } = createMockRouter({
        method: 'POST',
        body: mockCreateTicket
      })

      ;(ticketService.create as jest.Mock).mockResolvedValue({
        data: mockTicket,
        error: null
      })

      await handler(req, res)

      expect(ticketService.create).toHaveBeenCalledWith(mockCreateTicket)
      expect(res.status).toHaveBeenCalledWith(201)
      expect(res.json).toHaveBeenCalledWith({
        data: mockTicket
      })
    })

    it('should handle validation errors', async () => {
      const { req, res } = createMockRouter({
        method: 'POST',
        body: {}
      })

      const error = 'Invalid ticket data'
      ;(ticketService.create as jest.Mock).mockResolvedValue({
        data: null,
        error
      })

      await handler(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.json).toHaveBeenCalledWith({ error })
    })
  })

  describe('Invalid Methods', () => {
    it('should return 405 for invalid methods', async () => {
      const { req, res } = createMockRouter({
        method: 'PUT'
      })

      await handler(req, res)

      expect(res.status).toHaveBeenCalledWith(405)
      expect(res.setHeader).toHaveBeenCalledWith('Allow', ['GET', 'POST'])
    })
  })
}) 