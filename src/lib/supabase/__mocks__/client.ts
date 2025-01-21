import { Database } from '@/lib/types/database.types'
import { SupabaseClient, PostgrestSingleResponse } from '@supabase/supabase-js'

interface MockData {
  [key: string]: any
}

interface PostgrestError {
  name: string
  message: string
  details: string
  hint: string
  code: string
}

// Store mock data by table
const mockDataStore: { [table: string]: MockData[] } = {
  tickets: [],
  tags: [],
  ticket_tags: [],
  internal_notes: [],
  messages: [],
  agents: []
}

// Create a reusable mock query builder
const createMockQuery = () => {
  let currentTable = ''
  let currentFilters: any[] = []
  let currentOrder: any = null
  let currentNulls: { [field: string]: boolean } = {}

  type MockQueryType = {
    from: jest.Mock<any, [string]>
    select: jest.Mock<any>
    insert: jest.Mock<Promise<PostgrestSingleResponse<MockData>>, [MockData]>
    update: jest.Mock<Promise<PostgrestSingleResponse<MockData>>, [MockData]>
    delete: jest.Mock<Promise<PostgrestSingleResponse<MockData>>>
    eq: jest.Mock<any, [string, any]>
    order: jest.Mock<any, [string, any]>
    single: jest.Mock<Promise<PostgrestSingleResponse<MockData>>>
    is: jest.Mock<any, [string, boolean | null]>
    count: jest.Mock<Promise<PostgrestSingleResponse<{ count: number }>>>
  }

  const query: MockQueryType = {
    from: jest.fn((table: string) => {
      currentTable = table
      currentFilters = []
      currentOrder = null
      currentNulls = {}
      return query
    }),
    select: jest.fn(() => query),
    insert: jest.fn((data: MockData): Promise<PostgrestSingleResponse<MockData>> => {
      const newItem = {
        id: crypto.randomUUID(),
        created_at: new Date().toISOString(),
        ...data
      }
      mockDataStore[currentTable].push(newItem)
      return Promise.resolve({ 
        data: newItem, 
        error: null,
        status: 201,
        statusText: 'Created',
        count: null
      })
    }),
    update: jest.fn((data: MockData): Promise<PostgrestSingleResponse<MockData>> => {
      const items = mockDataStore[currentTable]
      const filtered = items.filter(item => 
        currentFilters.every(filter => item[filter.field] === filter.value) &&
        Object.entries(currentNulls).every(([field, isNull]) => 
          (item[field] === null) === isNull
        )
      )
      
      if (filtered.length === 0) {
        return Promise.resolve({ 
          data: null, 
          error: { 
            name: 'PostgrestError',
            message: 'Record not found', 
            details: '', 
            hint: '', 
            code: 'PGRST116' 
          },
          status: 404,
          statusText: 'Not Found',
          count: null
        })
      }

      filtered.forEach(item => {
        const index = items.findIndex(i => i.id === item.id)
        items[index] = { ...item, ...data }
      })

      return Promise.resolve({ 
        data: filtered[0], 
        error: null,
        status: 200,
        statusText: 'OK',
        count: null
      })
    }),
    delete: jest.fn((): Promise<PostgrestSingleResponse<MockData>> => {
      const items = mockDataStore[currentTable]
      const filtered = items.filter(item =>
        currentFilters.every(filter => item[filter.field] === filter.value) &&
        Object.entries(currentNulls).every(([field, isNull]) => 
          (item[field] === null) === isNull
        )
      )

      if (filtered.length === 0) {
        return Promise.resolve({
          data: null,
          error: { 
            name: 'PostgrestError',
            message: 'Record not found', 
            details: '', 
            hint: '', 
            code: 'PGRST116' 
          },
          status: 404,
          statusText: 'Not Found',
          count: null
        })
      }

      filtered.forEach(item => {
        const index = items.findIndex(i => i.id === item.id)
        items.splice(index, 1)
      })

      return Promise.resolve({ 
        data: filtered[0], 
        error: null,
        status: 204,
        statusText: 'No Content',
        count: null
      })
    }),
    eq: jest.fn((field: string, value: any) => {
      currentFilters.push({ field, value })
      return query
    }),
    order: jest.fn((field: string, options: any) => {
      currentOrder = { field, ...options }
      return query
    }),
    single: jest.fn((): Promise<PostgrestSingleResponse<MockData>> => {
      const items = mockDataStore[currentTable]
      const filtered = items.filter(item =>
        currentFilters.every(filter => item[filter.field] === filter.value) &&
        Object.entries(currentNulls).every(([field, isNull]) => 
          (item[field] === null) === isNull
        )
      )

      if (filtered.length === 0) {
        return Promise.resolve({ 
          data: null, 
          error: { 
            name: 'PostgrestError',
            message: 'Record not found', 
            details: '', 
            hint: '', 
            code: 'PGRST116' 
          },
          status: 404,
          statusText: 'Not Found',
          count: null
        })
      }

      return Promise.resolve({ 
        data: filtered[0], 
        error: null,
        status: 200,
        statusText: 'OK',
        count: null
      })
    }),
    is: jest.fn((field: string, isNull: boolean | null) => {
      currentNulls[field] = isNull ?? true
      return query
    }),
    count: jest.fn((): Promise<PostgrestSingleResponse<{ count: number }>> => {
      const items = mockDataStore[currentTable]
      const filtered = items.filter(item =>
        currentFilters.every(filter => item[filter.field] === filter.value) &&
        Object.entries(currentNulls).every(([field, isNull]) => 
          (item[field] === null) === isNull
        )
      )

      return Promise.resolve({
        data: { count: filtered.length },
        error: null,
        status: 200,
        statusText: 'OK',
        count: filtered.length
      })
    })
  }

  return query
}

// Mock user and session for auth
const mockUser = {
  id: 'test-user-id',
  email: 'test@example.com',
  role: 'authenticated'
}

const mockSession = {
  access_token: 'mock-access-token',
  refresh_token: 'mock-refresh-token',
  expires_in: 3600,
  user: mockUser
}

// Create the mock Supabase client
export const mockSupabaseClient = {
  from: jest.fn(() => createMockQuery()),
  auth: {
    getUser: jest.fn(() => Promise.resolve({ data: { user: mockUser }, error: null })),
    getSession: jest.fn(() => Promise.resolve({ data: { session: mockSession }, error: null })),
    onAuthStateChange: jest.fn((callback) => {
      // Store callback for testing auth state changes
      return { data: { subscription: { unsubscribe: jest.fn() } }, error: null }
    })
  }
} as unknown as SupabaseClient<Database>

// Helper to reset mock data between tests
export const resetMockData = () => {
  Object.keys(mockDataStore).forEach(table => {
    mockDataStore[table] = []
  })
}

// Export mock methods for testing
export const mockMethods = {
  select: jest.fn(),
  insert: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  eq: jest.fn(),
  order: jest.fn(),
  single: jest.fn(),
  is: jest.fn(),
  count: jest.fn()
}

// Export createClient factory
export const createClient = () => mockSupabaseClient 