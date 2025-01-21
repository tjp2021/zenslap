import { render, screen } from '@testing-library/react'
import { SLAIndicator } from '../SLAIndicator'
import { QueueManager } from '@/lib/services/QueueManager'
import { Ticket } from '@/lib/types'

const mockGetSLADeadline = jest.fn()

jest.mock('@/lib/services/QueueManager', () => ({
  QueueManager: jest.fn().mockImplementation(() => ({
    getSLADeadline: mockGetSLADeadline
  }))
}))

describe('SLAIndicator', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should display time remaining when not violated', () => {
    const now = new Date()
    const deadline = new Date(now.getTime() + 2 * 60 * 60 * 1000) // 2 hours from now
    
    mockGetSLADeadline.mockReturnValue(deadline)
    
    const ticket = {
      id: 'ticket-1',
      title: 'Test Ticket',
      description: 'Test Description',
      status: 'open',
      priority: 'high',
      metadata: {},
      created_by: 'user-1',
      created_at: new Date(Date.now() - 1000).toISOString(),
      updated_at: now.toISOString()
    } as Ticket
    
    render(<SLAIndicator ticket={ticket} />)
    expect(screen.getByText('1h 59m')).toBeInTheDocument()
  })

  it('should display warning state when close to deadline', () => {
    const now = new Date()
    const deadline = new Date(now.getTime() + 15 * 60 * 1000) // 15 minutes from now
    
    mockGetSLADeadline.mockReturnValue(deadline)
    
    const ticket = {
      id: 'ticket-1',
      title: 'Test Ticket',
      description: 'Test Description',
      status: 'open',
      priority: 'high',
      metadata: {},
      created_by: 'user-1',
      created_at: new Date(Date.now() - 105 * 60 * 1000).toISOString(),
      updated_at: now.toISOString()
    } as Ticket
    
    render(<SLAIndicator ticket={ticket} />)
    expect(screen.getByText('0h 14m')).toBeInTheDocument()
  })

  it('should display violated state when SLA is violated', () => {
    const now = new Date()
    const deadline = new Date(now.getTime() - 60 * 60 * 1000) // 1 hour ago
    
    mockGetSLADeadline.mockReturnValue(deadline)
    
    const ticket = {
      id: 'ticket-1',
      title: 'Test Ticket',
      description: 'Test Description',
      status: 'open',
      priority: 'high',
      metadata: {},
      created_by: 'user-1',
      created_at: new Date(Date.now() - 121 * 60 * 1000).toISOString(),
      updated_at: now.toISOString()
    } as Ticket
    
    render(<SLAIndicator ticket={ticket} />)
    expect(screen.getByText('SLA Violated')).toBeInTheDocument()
  })

  it('should display violated state when past deadline', () => {
    const now = new Date()
    const deadline = new Date(now.getTime() - 60 * 60 * 1000) // 1 hour ago
    
    mockGetSLADeadline.mockReturnValue(deadline)
    
    const ticket = {
      id: 'ticket-1',
      title: 'Test Ticket',
      description: 'Test Description',
      status: 'open',
      priority: 'high',
      metadata: {},
      created_by: 'user-1',
      created_at: now.toISOString(),
      updated_at: now.toISOString()
    } as Ticket
    
    render(<SLAIndicator ticket={ticket} />)
    expect(screen.getByText(/SLA Violated/i)).toBeInTheDocument()
  })
}) 