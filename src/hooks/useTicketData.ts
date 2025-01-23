/**
 * CORE SUPABASE INTEGRATION PATTERNS
 * ================================
 * 
 * Required Setup:
 * --------------
 * 1. Install deps:
 *    - @supabase/auth-helpers-nextjs
 *    - @supabase/supabase-js
 * 
 * 2. Environment Variables:
 *    - NEXT_PUBLIC_SUPABASE_URL
 *    - NEXT_PUBLIC_SUPABASE_ANON_KEY
 * 
 * 3. Types Setup:
 *    - Database type from generated types
 *    - Import in components/hooks that use Supabase
 * 
 * Authentication Flow:
 * ------------------
 * 1. Supabase Auth Helpers handle session automatically
 * 2. createClientComponentClient() sets up auth headers
 * 3. RLS policies in database control access
 * 4. NO manual JWT/session handling needed
 * 
 * Data Access Pattern:
 * ------------------
 * 1. Create Supabase client ONCE at top level
 * 2. Use SWR for caching/revalidation
 * 3. Throw Supabase errors for error boundaries
 * 4. Use proper types for compile-time safety
 * 
 * Performance Best Practices:
 * -------------------------
 * 1. Single client instance - DON'T create per function
 * 2. Use SWR's built-in caching
 * 3. Proper cache key structure with arrays
 * 4. Consistent revalidation settings
 * 
 * Error Handling:
 * --------------
 * 1. Destructure {data, error} from Supabase calls
 * 2. Always check error first
 * 3. Throw errors for boundary catching
 * 4. Use try/catch in components
 * 
 * ANTI-PATTERNS TO AVOID:
 * ----------------------
 * 1. DON'T create API routes for basic CRUD
 * 2. DON'T handle auth manually
 * 3. DON'T create new client per operation
 * 4. DON'T catch errors in hooks (let them bubble)
 * 
 * Database Access:
 * --------------
 * 1. Use proper column names in queries
 * 2. Let RLS handle permissions
 * 3. Use proper types for inserts/updates
 * 4. Chain query builders properly
 */

import useSWR, { mutate } from 'swr'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Ticket, UpdateTicketDTO } from '@/lib/types'
import { useAuth } from '@/lib/hooks/useAuth'
import type { Database } from '@/types/supabase'
import { useCallback } from 'react'
import { ACTIVITY_TYPES } from '@/lib/types/activities'
import { UserRole } from '@/lib/types'

// Create a single client instance
const supabase = createClientComponentClient<Database>()

const PAGE_SIZE = 20

interface TicketFilters {
  userId?: string
  status?: string
  priority?: string
  category?: string
  assignedTo?: string
  search?: string
}

/**
 * CORRECT DATABASE QUERY PATTERN
 * 
 * 1. Type safety with Database type
 * 2. RLS policies handle auth automatically
 * 3. Filters map to database columns
 * 4. Error handling via throw
 */
const fetchTickets = async ({ page = 1, pageSize = PAGE_SIZE, filters = {} as TicketFilters }) => {
  let query = supabase.from('tickets').select()

  // Apply filters - column names match database exactly
  const { userId, status, priority, category, assignedTo, search } = filters
  if (userId) query = query.eq('user_id', userId)
  if (status) query = query.eq('status', status)
  if (priority) query = query.eq('priority', priority)
  if (category) query = query.eq('category', category)
  if (assignedTo) query = query.eq('assigned_to', assignedTo)
  if (search) query = query.ilike('title', `%${search}%`)

  const { data, error } = await query
  if (error) throw error
  return { data }
}

const fetchTicket = async (id: string) => {
  const { data, error } = await supabase
    .from('tickets')
    .select()
    .eq('id', id)
    .single()
  
  if (error) throw error
  return { data }
}

const fetchUsers = async () => {
  const { data, error } = await supabase
    .from('users_secure')
    .select()
    .order('created_at', { ascending: false })
  
  if (error) throw error
  return { data }
}

/**
 * CORRECT HOOK PATTERN
 * 
 * 1. SWR for caching/revalidation
 * 2. Auth check before fetching
 * 3. Consistent return shape
 * 4. Proper error exposure
 */
export function useTicketList(page = 1, pageSize = PAGE_SIZE, filters: TicketFilters = {}) {
  const { user } = useAuth()
  const { data, error, mutate } = useSWR(
    user ? ['tickets', page, pageSize, filters] : null,
    () => fetchTickets({ page, pageSize, filters }),
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      dedupingInterval: 5000,
    }
  )

  return {
    tickets: data?.data || [],
    isLoading: !error && !data,
    isError: error,
    mutate,
  }
}

// Hook for single ticket
export function useTicket(id: string) {
  const { data: ticket, error, mutate } = useSWR<Ticket>(
    ['ticket', id], 
    async () => {
      const { data, error } = await supabase
        .from('tickets')
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error
      return data as Ticket
    },
    {
      revalidateOnFocus: false,
      revalidateIfStale: false,
      revalidateOnReconnect: false,
      dedupingInterval: 5000
    }
  )

  const updateTicket = useCallback(async (updates: UpdateTicketDTO) => {
    const { data: oldTicket } = await supabase
      .from('tickets')
      .select('*')
      .eq('id', id)
      .single()

    const { data: updatedTicket, error } = await supabase
      .from('tickets')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    // Track priority changes
    if (updates.priority && oldTicket?.priority !== updates.priority) {
      await supabase
        .from('ticket_activities')
        .insert({
          ticket_id: id,
          activity_type: ACTIVITY_TYPES.FIELD_CHANGE,
          content: {
            field: 'priority',
            from: oldTicket?.priority,
            to: updates.priority
          }
        })
    }

    await mutate(updatedTicket as Ticket)
    return updatedTicket as Ticket
  }, [supabase, id, mutate])

  return {
    ticket,
    isLoading: !error && !ticket,
    isError: error,
    mutate,
    updateTicket
  }
}

// Hook for mutations
export function useTicketMutations() {
  const { mutate: globalMutate } = useSWR(['tickets'], fetchTickets)

  const createTicket = async (ticket: Omit<Ticket, 'id' | 'created_at'>) => {
    const { data, error } = await supabase
      .from('tickets')
      .insert(ticket)
      .select()
      .single()
    
    if (error) throw error
    await globalMutate()
    return { data }
  }

  const updateTicket = async (id: string, updates: Partial<Ticket>) => {
    const { data, error } = await supabase
      .from('tickets')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    await globalMutate()
    return { data }
  }

  const deleteTicket = async (id: string) => {
    const { error } = await supabase
      .from('tickets')
      .delete()
      .eq('id', id)
    
    if (error) throw error
    await globalMutate()
    return { success: true }
  }

  return {
    createTicket,
    updateTicket,
    deleteTicket,
  }
}

// Hook for fetching users
export function useUsers() {
  const { data, error } = useSWR('users', async () => {
    const { data, error } = await supabase
      .from('users_secure')
      .select('id, email, role')
      .in('role', [UserRole.ADMIN, UserRole.AGENT])
      .order('email')

    if (error) throw error
    return data || []
  }, {
    revalidateOnFocus: false,
    dedupingInterval: 60000 // Cache for 1 minute
  })

  return {
    users: data,
    isLoading: !error && !data,
    isError: error
  }
}

const fetchActivities = async (ticketId: string) => {
  const { data, error } = await supabase
    .from('ticket_activities')
    .select()
    .eq('ticket_id', ticketId)
    .order('created_at', { ascending: true })
  
  if (error) throw error
  return { data }
}

// Hook for ticket activities
export function useTicketActivities(ticketId: string) {
  const { user } = useAuth()
  const { data, error, isLoading, mutate } = useSWR(
    user && ticketId ? ['ticket-activities', ticketId] : null,
    () => fetchActivities(ticketId),
    {
      revalidateOnFocus: false,
      dedupingInterval: 5000
    }
  )

  return {
    activities: data?.data || [],
    error,
    isLoading,
    mutate
  }
} 