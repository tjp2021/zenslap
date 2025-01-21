import { render, screen } from '@testing-library/react'
import { SLAIndicator } from '../SLAIndicator'
import { QueueManager } from '@/lib/services/QueueManager'
import { vi, describe, it, expect, beforeEach } from 'vitest'

// Mock QueueManager
vi.mock('@/lib/services/QueueManager', () => ({
  QueueManager: vi.fn().mockImplementation(() => ({
    getSLADeadline: vi.fn()
  }))
}))

describe('SLAIndicator', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should display time remaining when not violated', () => {
    const now = new Date()
    const deadline = new Date(now.getTime() + 2 * 60 * 60 * 1000) // 2 hours from now
    
    vi.mocked(QueueManager.prototype.getSLADeadline).mockReturnValue(deadline)
    
    const ticket = {
      id: 'ticket-1',
      priority: 'high',
      created_at: now.toISOString(),
      metadata: {}
    } as any

    render(<SLAIndicator ticket={ticket} />)

    expect(screen.getByText('2h 0m')).toBeInTheDocument()
    expect(screen.getByTestId('clock-icon')).toHaveClass('text-green-500')
  })

  it('should display warning state when close to deadline', () => {
    const now = new Date()
    const deadline = new Date(now.getTime() + 15 * 60 * 1000) // 15 minutes from now
    
    vi.mocked(QueueManager.prototype.getSLADeadline).mockReturnValue(deadline)
    
    const ticket = {
      id: 'ticket-1',
      priority: 'high',
      created_at: now.toISOString(),
      metadata: {}
    } as any

    render(<SLAIndicator ticket={ticket} />)

    expect(screen.getByText('0h 15m')).toBeInTheDocument()
    expect(screen.getByTestId('clock-icon')).toHaveClass('text-yellow-500')
  })

  it('should display violated state when SLA is violated', () => {
    const now = new Date()
    const deadline = new Date(now.getTime() - 60 * 60 * 1000) // 1 hour ago
    
    vi.mocked(QueueManager.prototype.getSLADeadline).mockReturnValue(deadline)
    
    const ticket = {
      id: 'ticket-1',
      priority: 'high',
      created_at: now.toISOString(),
      metadata: {
        sla_violated: true
      }
    } as any

    render(<SLAIndicator ticket={ticket} />)

    expect(screen.getByText('SLA Violated')).toBeInTheDocument()
    expect(screen.getByTestId('clock-icon')).toHaveClass('text-red-500')
  })

  it('should display violated state when past deadline', () => {
    const now = new Date()
    const deadline = new Date(now.getTime() - 60 * 60 * 1000) // 1 hour ago
    
    vi.mocked(QueueManager.prototype.getSLADeadline).mockReturnValue(deadline)
    
    const ticket = {
      id: 'ticket-1',
      priority: 'high',
      created_at: now.toISOString(),
      metadata: {}
    } as any

    render(<SLAIndicator ticket={ticket} />)

    expect(screen.getByText('SLA Violated')).toBeInTheDocument()
    expect(screen.getByTestId('clock-icon')).toHaveClass('text-red-500')
  })
}) 