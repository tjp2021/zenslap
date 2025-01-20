import { createMockRouter } from '@/lib/test-utils'
import handler from '../tickets/[id]'
import { ticketService } from '@/lib/api/routes/tickets'
import { createMockTicket, createMockUpdateTicketDTO } from '@/lib/test-utils'

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

describe('Single Ticket API', () => {
  const mockTicket = createMockTicket()
  const ticketId = '123'

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET /api/tickets/[id]', () => {
    it('should return a single ticket', async () => {
      const { req, res } = createMockRouter({
        method: 'GET',
        query: { id: ticketId }
      })

      ;(ticketService.getById as jest.Mock).mockResolvedValue({
        data: mockTicket,
        error: null
      })

      await handler(req, res)

      expect(ticketService.getById).toHaveBeenCalledWith(ticketId)
      expect(res.status).toHaveBeenCalledWith(200)
      expect(res.json).toHaveBeenCalledWith({
        data: mockTicket
      })
    })

    it('should return 404 when ticket not found', async () => {
      const { req, res } = createMockRouter({
        method: 'GET',
        query: { id: ticketId }
      })

      ;(ticketService.getById as jest.Mock).mockResolvedValue({
        data: null,
        error: null
      })

      await handler(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
      expect(res.json).toHaveBeenCalledWith({
        error: 'Ticket not found'
      })
    })
  })

  describe('PUT /api/tickets/[id]', () => {
    it('should update a ticket', async () => {
      const updateData = createMockUpdateTicketDTO(ticketId)
      const { req, res } = createMockRouter({
        method: 'PUT',
        query: { id: ticketId },
        body: updateData
      })

      ;(ticketService.update as jest.Mock).mockResolvedValue({
        data: { ...mockTicket, ...updateData },
        error: null
      })

      await handler(req, res)

      expect(ticketService.update).toHaveBeenCalledWith(updateData)
      expect(res.status).toHaveBeenCalledWith(200)
      expect(res.json).toHaveBeenCalledWith({
        data: { ...mockTicket, ...updateData }
      })
    })

    it('should handle validation errors', async () => {
      const { req, res } = createMockRouter({
        method: 'PUT',
        query: { id: ticketId },
        body: {}
      })

      const error = 'Invalid update data'
      ;(ticketService.update as jest.Mock).mockResolvedValue({
        data: null,
        error
      })

      await handler(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.json).toHaveBeenCalledWith({ error })
    })
  })

  describe('DELETE /api/tickets/[id]', () => {
    it('should delete a ticket', async () => {
      const { req, res } = createMockRouter({
        method: 'DELETE',
        query: { id: ticketId }
      })

      ;(ticketService.delete as jest.Mock).mockResolvedValue({
        data: true,
        error: null
      })

      await handler(req, res)

      expect(ticketService.delete).toHaveBeenCalledWith(ticketId)
      expect(res.status).toHaveBeenCalledWith(204)
      expect(res.end).toHaveBeenCalled()
    })

    it('should handle deletion errors', async () => {
      const { req, res } = createMockRouter({
        method: 'DELETE',
        query: { id: ticketId }
      })

      const error = 'Failed to delete ticket'
      ;(ticketService.delete as jest.Mock).mockResolvedValue({
        data: false,
        error
      })

      await handler(req, res)

      expect(res.status).toHaveBeenCalledWith(500)
      expect(res.json).toHaveBeenCalledWith({ error })
    })
  })

  describe('Invalid Methods', () => {
    it('should return 405 for invalid methods', async () => {
      const { req, res } = createMockRouter({
        method: 'POST',
        query: { id: ticketId }
      })

      await handler(req, res)

      expect(res.status).toHaveBeenCalledWith(405)
      expect(res.setHeader).toHaveBeenCalledWith('Allow', ['GET', 'PUT', 'DELETE'])
    })
  })
}) 