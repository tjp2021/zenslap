import { SupabaseClient } from '@supabase/supabase-js'

const VALID_UUID = '123e4567-e89b-12d3-a456-426614174000'

const mockTicket = {
  id: '123',
  title: 'Test Ticket',
  description: 'Test Description',
  status: 'open',
  priority: 'medium',
  metadata: {},
  created_at: '2025-01-20T21:05:10.183Z',
  updated_at: '2025-01-20T21:05:10.183Z'
}

interface SupabaseError {
  message: string
  code: string
  details: string
  hint: string
}

interface QueryBuilder {
  data: any
  error: SupabaseError | null
  select: () => QueryBuilder
  eq: (column: string, value: any) => QueryBuilder
  single: () => Promise<{ data: any, error: SupabaseError | null }>
  maybeSingle: () => Promise<{ data: any, error: SupabaseError | null }>
  insert: (data: any) => Promise<{ data: any, error: SupabaseError | null }>
  update: (data: any) => Promise<{ data: any, error: SupabaseError | null }>
  delete: () => Promise<{ data: any, error: SupabaseError | null }>
}

const createSupabaseError = (message: string, code = 'VALIDATION_ERROR', details = '', hint = ''): SupabaseError => ({
  message,
  code,
  details,
  hint
})

const createQueryBuilder = (table: string): QueryBuilder => {
  let currentData = mockTicket
  let currentError: SupabaseError | null = null

  const builder: QueryBuilder = {
    data: currentData,
    error: currentError,

    select() {
      return this
    },

    eq(column: string, value: any) {
      if (table === 'error_table') {
        currentError = createSupabaseError('Database error', 'PGRST116')
        currentData = null
      } else if (column === 'id') {
        if (!value) {
          currentError = createSupabaseError('Ticket ID is required')
          currentData = null
        } else if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(value)) {
          currentError = createSupabaseError('Invalid uuid')
          currentData = null
        }
      }
      return this
    },

    async single() {
      return { data: currentData, error: currentError }
    },

    async maybeSingle() {
      return { data: currentData, error: currentError }
    },

    async insert(data: any) {
      if (!data) {
        return { data: null, error: createSupabaseError('Empty data provided') }
      }
      if (!data.title) {
        return { data: null, error: createSupabaseError('Title is required') }
      }
      return { data: mockTicket, error: null }
    },

    async update(data: any) {
      if (!data) {
        return { data: null, error: createSupabaseError('Empty data provided') }
      }
      return { data: mockTicket, error: null }
    },

    async delete() {
      return { data: { success: true }, error: null }
    }
  }

  return builder
}

export const createMockSupabaseClient = () => ({
  from: (table: string) => createQueryBuilder(table),
  auth: {
    getUser: () => Promise.resolve({ data: { user: { id: '123' } }, error: null }),
    getSession: () => Promise.resolve({ data: { session: { user: { id: '123' } } }, error: null }),
    signOut: () => Promise.resolve({ error: null })
  },
  storage: {
    from: (bucket: string) => ({
      upload: (path: string, file: any) => Promise.resolve({ data: { path }, error: null }),
      download: (path: string) => Promise.resolve({ data: new Uint8Array(), error: null })
    })
  }
}) 