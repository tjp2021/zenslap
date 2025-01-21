// Learn more: https://github.com/testing-library/jest-dom
require('@testing-library/jest-dom')

// Add environment variables for testing
process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-key'

// Add any global test setup here
require('@testing-library/jest-dom')

// Mock createClientComponentClient
const mockSupabase = {
  auth: {
    getUser: jest.fn(),
    getSession: jest.fn(),
    signOut: jest.fn(),
  },
  from: jest.fn(() => ({
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    single: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
  })),
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