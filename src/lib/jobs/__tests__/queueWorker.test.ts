import { createMockSupabaseClient } from '@/lib/context/__tests__/test-utils'
import { createClient } from '@/lib/supabase/client'
import { jest } from '@jest/globals'
import { runQueueWorker } from '../queueWorker'

jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn()
}))

describe('queueWorker', () => {
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>

  beforeEach(() => {
    mockSupabase = createMockSupabaseClient({})
    jest.mocked(createClient).mockImplementation(() => mockSupabase)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('processes unassigned tickets', async () => {
    mockSupabase.mockMethods.select.mockResolvedValueOnce({
      data: [{ id: 'ticket-1' }, { id: 'ticket-2' }],
      error: null
    })

    mockSupabase.mockMethods.update.mockResolvedValueOnce({
      data: null,
      error: null
    })

    await runQueueWorker()

    expect(mockSupabase.mockMethods.select).toHaveBeenCalled()
    expect(mockSupabase.mockMethods.update).toHaveBeenCalled()
  })

  it('handles no unassigned tickets', async () => {
    mockSupabase.mockMethods.select.mockResolvedValueOnce({
      data: [],
      error: null
    })

    await runQueueWorker()

    expect(mockSupabase.mockMethods.select).toHaveBeenCalled()
    expect(mockSupabase.mockMethods.update).not.toHaveBeenCalled()
  })

  it('handles database errors', async () => {
    mockSupabase.mockMethods.select.mockRejectedValueOnce(new Error('Database error'))

    await runQueueWorker()

    expect(mockSupabase.mockMethods.select).toHaveBeenCalled()
    expect(mockSupabase.mockMethods.update).not.toHaveBeenCalled()
  })
}) 