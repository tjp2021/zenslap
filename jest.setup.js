// Import Jest globals first
const { expect } = require('@jest/globals')

// Import Jest DOM matchers
require('@testing-library/jest-dom')

// Mock environment variables
process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test'

// Mock window
global.window = {
  matchMedia: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
  scrollTo: jest.fn(),
  getComputedStyle: jest.fn(() => ({
    getPropertyValue: jest.fn(),
  })),
}

// Mock crypto for UUID generation
global.crypto = {
  randomUUID: () => '123e4567-e89b-12d3-a456-426614174000'
}

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  observe() {}
  unobserve() {}
  disconnect() {}
}

const VALID_UUID = '123e4567-e89b-12d3-a456-426614174000'

const mockTicket = {
  id: '123',
  title: 'Test Ticket',
  description: 'Test Description',
  status: 'open',
  priority: 'medium',
  created_at: '2025-01-20T21:05:10.183Z',
  updated_at: '2025-01-20T21:05:10.183Z',
  metadata: {}
}

function createSupabaseError(message, code = 'PGRST116', details = '', hint = '') {
  return {
    message,
    code,
    details,
    hint
  }
}

function createMockSupabaseClient() {
  let queryBuilder = {
    select: () => queryBuilder,
    eq: () => queryBuilder,
    order: () => queryBuilder,
    limit: () => queryBuilder,
    single: () => {
      if (queryBuilder.table === 'error_table') {
        return Promise.resolve({ data: null, error: createSupabaseError('Database error') })
      }
      return Promise.resolve({ data: mockTicket, error: null })
    },
    maybeSingle: () => {
      if (queryBuilder.table === 'error_table') {
        return Promise.resolve({ data: null, error: createSupabaseError('Database error') })
      }
      return Promise.resolve({ data: mockTicket, error: null })
    },
    insert: (data) => {
      if (!data) {
        return Promise.resolve({ data: null, error: createSupabaseError('Empty data provided', 'VALIDATION_ERROR') })
      }
      if (!data.title) {
        return Promise.resolve({ data: null, error: createSupabaseError('Title is required', 'VALIDATION_ERROR') })
      }
      return Promise.resolve({ data: mockTicket, error: null })
    },
    update: (data) => {
      if (!data) {
        return Promise.resolve({ data: null, error: createSupabaseError('Empty data provided', 'VALIDATION_ERROR') })
      }
      return Promise.resolve({ data: mockTicket, error: null })
    },
    delete: () => {
      return Promise.resolve({ data: { success: true }, error: null })
    }
  }

  return {
    from: (table) => {
      queryBuilder.table = table
      return queryBuilder
    },
    auth: {
      getUser: () => Promise.resolve({ data: { user: { id: '123' } }, error: null }),
      getSession: () => Promise.resolve({ data: { session: { user: { id: '123' } } }, error: null }),
      signOut: () => Promise.resolve({ error: null })
    },
    storage: {
      from: () => ({
        upload: () => Promise.resolve({ data: { path: 'test.jpg' }, error: null }),
        download: () => Promise.resolve({ data: new Blob(), error: null })
      })
    }
  }
}

jest.mock('@supabase/auth-helpers-nextjs', () => ({
  createClientComponentClient: () => mockSupabase
}))

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    refresh: jest.fn(),
  }),
  useSearchParams: () => ({
    get: jest.fn(),
  }),
}))

// Add custom matchers
expect.extend({
  toHaveBeenCalledWithMatch(received, ...expected) {
    const pass = received.mock.calls.some(call =>
      expected.every((arg, i) => {
        if (typeof arg === 'object') {
          return expect.objectContaining(arg).asymmetricMatch(call[i])
        }
        return arg === call[i]
      })
    )

    return {
      pass,
      message: () =>
        `expected ${received.getMockName()} to have been called with arguments matching ${expected.join(', ')}`,
    }
  },
})

// Silence console errors in tests
const originalError = console.error
beforeAll(() => {
  console.error = (...args) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('Warning: ReactDOM.render is no longer supported')
    ) {
      return
    }
    originalError.call(console, ...args)
  }
})

afterAll(() => {
  console.error = originalError
})

// Add any global test setup here
require('@testing-library/jest-dom') 