import '@testing-library/jest-dom'
import React from 'react'
import { mockSupabaseClient } from '../supabase/__mocks__/client'

// Mock Supabase client
jest.mock('@/lib/supabase/client', () => ({
  __esModule: true,
  default: mockSupabaseClient,
  createClient: jest.fn().mockReturnValue(mockSupabaseClient)
}))

// Mock UI components
jest.mock('@/components/ui', () => ({
  Select: ({ children, value, onValueChange }: any) => (
    <select data-testid="select" value={value} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => onValueChange?.(e.target.value)}>
      {children}
    </select>
  ),
  SelectTrigger: ({ children }: any) => <div data-testid="select-trigger">{children}</div>,
  SelectValue: ({ children }: any) => <div data-testid="select-value">{children}</div>,
  SelectContent: ({ children }: any) => <div data-testid="select-content">{children}</div>,
  SelectItem: ({ children, value }: any) => (
    <option data-testid="select-item" value={value}>
      {children}
    </option>
  ),
  Card: ({ children, className }: any) => (
    <div data-testid="card" className={className}>
      {children}
    </div>
  ),
  ScrollArea: ({ children }: any) => <div data-testid="scroll-area">{children}</div>
}))

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

// Clear mocks after each test
afterEach(() => {
  jest.clearAllMocks()
}) 