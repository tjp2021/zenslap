import React from 'react'
import { render } from '@testing-library/react'
import { TicketsProvider, useTickets, type TicketsContextType } from '../tickets'

interface TestComponentProps {
  onMount: (context: TicketsContextType) => void
}

// Test component to access context
export const TestComponent: React.FC<TestComponentProps> = ({ onMount }) => {
  const context = useTickets()
  
  React.useEffect(() => {
    onMount(context)
  }, [onMount, context])
  
  return null
}

// Helper to render with providers and wait for context
export function renderWithContext(
  onMount: (context: TicketsContextType) => void
): Promise<TicketsContextType> {
  let contextValue: TicketsContextType | undefined

  render(
    <TicketsProvider>
      <TestComponent 
        onMount={(context) => {
          contextValue = context
          onMount(context)
        }} 
      />
    </TicketsProvider>
  )

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Timeout waiting for context')), 5000)
    const check = () => {
      if (contextValue) {
        clearTimeout(timeout)
        resolve(contextValue)
      } else {
        setTimeout(check, 100)
      }
    }
    check()
  })
}

// Helper to render with providers
export function renderWithProviders(ui: React.ReactElement) {
  return render(
    <TicketsProvider>
      {ui}
    </TicketsProvider>
  )
}

// Mock Supabase response types
export type MockSupabaseResponse = {
  data: any
  error: Error | null
}

// Create mock Supabase client
export function createMockSupabaseClient(responses: {
  select?: MockSupabaseResponse
  update?: MockSupabaseResponse
  insert?: MockSupabaseResponse
  delete?: MockSupabaseResponse
} = {}) {
  const mockMethods = {
    select: jest.fn(() => ({
      order: jest.fn().mockResolvedValue(responses.select || { data: [], error: null })
    })),
    update: jest.fn(() => ({
      eq: jest.fn().mockResolvedValue(responses.update || { error: null })
    })),
    insert: jest.fn().mockResolvedValue(responses.insert || { error: null }),
    delete: jest.fn(() => ({
      eq: jest.fn().mockResolvedValue(responses.delete || { error: null })
    }))
  }

  const mockFrom = jest.fn(() => mockMethods)

  return {
    from: mockFrom,
    mockMethods
  }
}

// Helper to wait for element
export function waitForElement(predicate: () => HTMLElement | null): Promise<HTMLElement> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Timeout waiting for element')), 5000)
    const check = () => {
      const element = predicate()
      if (element) {
        clearTimeout(timeout)
        resolve(element)
      } else {
        setTimeout(check, 100)
      }
    }
    check()
  })
}

// Helper to find element by text
export function findByText(text: string | RegExp): Promise<HTMLElement> {
  return waitForElement(() => {
    const elements = Array.from(document.querySelectorAll('*'))
    return elements.find(el => 
      typeof text === 'string' 
        ? el.textContent?.includes(text)
        : text.test(el.textContent || '')
    ) as HTMLElement | null
  })
}

// Helper to find element by test id
export function findByTestId(testId: string): Promise<HTMLElement> {
  return waitForElement(() => document.querySelector(`[data-testid="${testId}"]`) as HTMLElement | null)
} 