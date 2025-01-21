import { createClient } from '@supabase/supabase-js'

// Mock Supabase client
const mockSupabaseClient = {
  from: jest.fn((table: string) => ({
    select: jest.fn(() => Promise.resolve({ data: [], error: null })),
    insert: jest.fn(() => Promise.resolve({ data: null, error: null })),
    update: jest.fn(() => Promise.resolve({ data: null, error: null })),
    delete: jest.fn(() => Promise.resolve({ data: null, error: null })),
    eq: jest.fn(() => Promise.resolve({ data: null, error: null })),
    single: jest.fn(() => Promise.resolve({ data: null, error: null })),
    order: jest.fn(() => Promise.resolve({ data: null, error: null })),
  })),
  auth: {
    getUser: jest.fn(() => Promise.resolve({ data: { user: null }, error: null })),
    getSession: jest.fn(() => Promise.resolve({ data: { session: null }, error: null })),
    onAuthStateChange: jest.fn(() => ({ data: { subscription: { unsubscribe: jest.fn() } }, error: null })),
  },
}

// Helper to create mock responses
export const createMockResponse = <T>(data: T) => ({
  data,
  error: null,
})

export const createMockError = (message: string) => ({
  data: null,
  error: { message, code: 'TEST_ERROR' },
})

// Mock the createClient function
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => mockSupabaseClient),
}))

export { mockSupabaseClient } 