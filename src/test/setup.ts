import '@testing-library/jest-dom'
import { mockSupabaseClient } from './mocks/supabase'

// Mock Supabase client
jest.mock('@/lib/supabase/client', () => ({
  supabase: mockSupabaseClient,
}))

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
    }
  },
  useSearchParams() {
    return {
      get: jest.fn(),
      set: jest.fn(),
    }
  },
}))

// Mock UI components
jest.mock('@/components/ui/select', () => require('../test/mocks/ui'))
jest.mock('@/components/ui/card', () => require('../test/mocks/ui'))
jest.mock('@/components/ui/scroll-area', () => require('../test/mocks/ui'))

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks()
}) 