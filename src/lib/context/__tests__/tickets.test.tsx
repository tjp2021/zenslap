import { render, screen, act } from '@testing-library/react'
import '@testing-library/jest-dom'
import { TicketsProvider, useTickets, TicketsContextType } from '../tickets'
import { createMockSupabaseClient } from './test-utils'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { CreateTicketDTO } from '@/lib/types'
import React from 'react'
import { findByText, findByTestId } from './test-utils'

// Mock Supabase client
jest.mock('@supabase/auth-helpers-nextjs', () => ({
  createClientComponentClient: jest.fn()
}))

interface TestComponentProps {
  onMount?: (context: TicketsContextType) => void
}

const TestComponent: React.FC<TestComponentProps> = ({ onMount }) => {
  const context = useTickets()
  
  React.useEffect(() => {
    if (onMount) {
      onMount(context)
    }
  }, [context, onMount])

  const opState = context.getOperationState('load')
  
  return (
    <div>
      {opState?.status === 'loading' && <div>Loading...</div>}
      {opState?.status === 'error' && <div>Error: {opState.error}</div>}
      <div data-testid="tickets-count">Tickets: {context.tickets.length}</div>
      <button onClick={() => context.createTicket(mockTicketData)}>
        Create Ticket
      </button>
    </div>
  )
}

const mockTicketData: CreateTicketDTO = {
  title: 'Test',
  description: 'Test',
  status: 'open',
  priority: 'medium',
  metadata: {}
}

describe('TicketsContext - CRUD Operations', () => {
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>

  beforeEach(() => {
    mockSupabase = createMockSupabaseClient()
    ;(createClientComponentClient as jest.Mock).mockReturnValue(mockSupabase)
  })

  it('provides tickets data and loading state', async () => {
    render(
      <TicketsProvider>
        <TestComponent />
      </TicketsProvider>
    )

    // Should show loading initially
    expect(screen.getByText('Loading...')).toBeInTheDocument()

    // Should show tickets count after loading
    const ticketsCount = await findByTestId('tickets-count')
    expect(ticketsCount).toHaveTextContent('Tickets: 0')
  })

  it('handles ticket creation', async () => {
    render(
      <TicketsProvider>
        <TestComponent />
      </TicketsProvider>
    )

    const ticketsCount = await findByTestId('tickets-count')
    expect(ticketsCount).toHaveTextContent('Tickets: 0')

    // Click create ticket button
    screen.getByText('Create Ticket').click()

    // Verify Supabase was called
    expect(mockSupabase.from).toHaveBeenCalled()
    expect(mockSupabase.mockMethods.insert).toHaveBeenCalled()
  })

  it('handles errors gracefully', async () => {
    // Mock error response
    mockSupabase = createMockSupabaseClient({
      select: { data: null, error: new Error('Failed to load') }
    })
    ;(createClientComponentClient as jest.Mock).mockReturnValue(mockSupabase)

    render(
      <TicketsProvider>
        <TestComponent />
      </TicketsProvider>
    )

    const errorMessage = await findByText(/Failed to load tickets/)
    expect(errorMessage).toBeInTheDocument()
  })
})

describe('TicketsContext - Assign Operations', () => {
  const mockSupabase = createMockSupabaseClient()

  beforeEach(() => {
    jest.clearAllMocks()
    ;(createClientComponentClient as jest.Mock).mockReturnValue(mockSupabase)
  })

  it('should assign tickets successfully', async () => {
    const ticketIds = ['1', '2']
    const assigneeId = 'user1'

    mockSupabase.mockMethods.update.mockResolvedValueOnce({ data: null, error: null })

    let context: TicketsContextType | undefined

    await act(async () => {
      render(
        <TicketsProvider>
          <TestComponent onMount={ctx => { context = ctx }} />
        </TicketsProvider>
      )
    })

    expect(context).toBeDefined()

    await act(async () => {
      const result = await context!.assignTickets(ticketIds, assigneeId)
      expect(result.error).toBeNull()
    })

    expect(mockSupabase.mockMethods.update).toHaveBeenCalledTimes(ticketIds.length)
    expect(mockSupabase.mockMethods.update).toHaveBeenCalledWith({ assignee_id: assigneeId })

    const opState = context!.getOperationState('assign')
    expect(opState?.status).toBe('success')
  })

  it('should handle errors when assigning tickets', async () => {
    const ticketIds = ['1', '2']
    const assigneeId = 'user1'

    mockSupabase.mockMethods.update.mockRejectedValueOnce(new Error('Failed to assign'))

    let context: TicketsContextType | undefined

    await act(async () => {
      render(
        <TicketsProvider>
          <TestComponent onMount={ctx => { context = ctx }} />
        </TicketsProvider>
      )
    })

    expect(context).toBeDefined()

    await act(async () => {
      const result = await context!.assignTickets(ticketIds, assigneeId)
      expect(result.error).toBe('Failed to assign tickets. Please try again.')
    })

    const opState = context!.getOperationState('assign')
    expect(opState?.status).toBe('error')
    expect(opState?.error).toBe('Failed to assign tickets. Please try again.')
  })

  it('should unassign tickets successfully', async () => {
    const ticketIds = ['1', '2']

    mockSupabase.mockMethods.update.mockResolvedValueOnce({ data: null, error: null })

    let context: TicketsContextType | undefined

    await act(async () => {
      render(
        <TicketsProvider>
          <TestComponent onMount={ctx => { context = ctx }} />
        </TicketsProvider>
      )
    })

    expect(context).toBeDefined()

    await act(async () => {
      const result = await context!.assignTickets(ticketIds, null)
      expect(result.error).toBeNull()
    })

    expect(mockSupabase.mockMethods.update).toHaveBeenCalledTimes(ticketIds.length)
    expect(mockSupabase.mockMethods.update).toHaveBeenCalledWith({ assignee_id: null })

    const opState = context!.getOperationState('assign')
    expect(opState?.status).toBe('success')
  })
}) 