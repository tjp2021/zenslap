import { QueueManager } from '../../services/QueueManager'
import { createClient } from '@/lib/supabase/client'

jest.mock('@/lib/supabase/client')

describe('QueueManager', () => {
  let queueManager: QueueManager
  let mockSupabase: any

  beforeEach(() => {
    mockSupabase = {
      mockMethods: {
        count: jest.fn(),
        select: jest.fn(),
        update: jest.fn(),
        eq: jest.fn(),
        is: jest.fn(),
        order: jest.fn(),
        single: jest.fn()
      },
      from: jest.fn().mockReturnThis()
    }

    // Set up method chaining
    Object.assign(mockSupabase, mockSupabase.mockMethods)
    mockSupabase.from.mockReturnValue(mockSupabase)

    jest.mocked(createClient).mockReturnValue(mockSupabase)
    queueManager = new QueueManager()
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('getAgentWorkload', () => {
    it('returns the workload count for an agent', async () => {
      mockSupabase.mockMethods.count.mockResolvedValueOnce({ data: { count: 2 }, error: null })

      const workload = await queueManager.getAgentWorkload('agent-1')
      expect(workload).toBe(2)
    })

    it('should handle errors', async () => {
      mockSupabase.mockMethods.count.mockRejectedValueOnce(new Error('Database error'))

      await expect(queueManager.getAgentWorkload('agent-1')).rejects.toThrow('Database error')
    })
  })

  describe('findAvailableAgent', () => {
    it('returns the agent with lowest workload', async () => {
      mockSupabase.mockMethods.select.mockResolvedValueOnce({
        data: [
          { id: 'agent-1', workload: 2 },
          { id: 'agent-2', workload: 1 }
        ],
        error: null
      })

      const agentId = await queueManager.findAvailableAgent('high')
      expect(agentId).toBe('agent-2')
    })

    it('returns null when no agents available', async () => {
      mockSupabase.mockMethods.select.mockResolvedValueOnce({ data: [], error: null })

      const agentId = await queueManager.findAvailableAgent('high')
      expect(agentId).toBeNull()
    })
  })

  describe('autoAssignTicket', () => {
    it('assigns ticket to available agent', async () => {
      mockSupabase.mockMethods.select.mockResolvedValueOnce({
        data: [{ id: 'agent-1', workload: 1 }],
        error: null
      })

      mockSupabase.mockMethods.update.mockResolvedValueOnce({
        data: { id: 'ticket-1', assignee: 'agent-1' },
        error: null
      })

      await queueManager.autoAssignTicket('ticket-1')
      expect(mockSupabase.mockMethods.update).toHaveBeenCalledWith({ assignee: 'agent-1' })
    })

    it('returns null when no agents available', async () => {
      mockSupabase.mockMethods.select.mockResolvedValueOnce({ data: [], error: null })

      await queueManager.autoAssignTicket('ticket-1')
      expect(mockSupabase.mockMethods.update).not.toHaveBeenCalled()
    })
  })

  describe('checkSLAViolations', () => {
    it('updates tickets with SLA violations', async () => {
      mockSupabase.mockMethods.select.mockResolvedValueOnce({
        data: [{ id: 'ticket-1' }, { id: 'ticket-2' }],
        error: null
      })

      mockSupabase.mockMethods.update.mockResolvedValueOnce({
        data: { success: true },
        error: null
      })

      await queueManager.checkSLAViolations()
      expect(mockSupabase.mockMethods.update).toHaveBeenCalledWith({ sla_violated: true })
    })

    it('handles no violated tickets', async () => {
      mockSupabase.mockMethods.select.mockResolvedValueOnce({ data: [], error: null })

      await queueManager.checkSLAViolations()
      expect(mockSupabase.mockMethods.update).not.toHaveBeenCalled()
    })
  })
}) 