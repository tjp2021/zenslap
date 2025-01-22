import useSWR, { mutate } from 'swr'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Ticket } from '@/lib/types'
import { useState } from 'react'
import { ticketService } from '@/lib/api/routes/tickets'
import type { TicketActivity } from '@/lib/api/routes/tickets'

// Initialize with proper options
const supabase = createClientComponentClient({
  options: {
    global: {
      headers: {
        'X-Client-Info': '@supabase/auth-helpers-nextjs'
      }
    }
  }
})

const PAGE_SIZE = 20

// Fetcher function for a single ticket
const fetchTicket = async (id: string) => {
  const { data, error } = await supabase
    .from('tickets')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error
  return data as Ticket
}

// Update fetcher to support pagination
const fetchTickets = async ({ page = 1, pageSize = PAGE_SIZE }) => {
  const start = (page - 1) * pageSize
  const end = start + pageSize - 1

  const { data, error, count } = await supabase
    .from('tickets')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(start, end)

  if (error) throw error
  return {
    tickets: data as Ticket[],
    totalCount: count || 0,
    currentPage: page,
    totalPages: count ? Math.ceil(count / pageSize) : 0,
    pageSize
  }
}

// Add user fetcher
const fetchUsers = async () => {
  try {
    // Get session first to ensure user is authenticated
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    if (sessionError || !session) {
      console.error('Session error:', sessionError)
      return [] // Return empty array instead of throwing
    }

    console.log('Current session:', session)

    // Get all users from secure table
    const { data: users, error: usersError } = await supabase
      .from('users_secure')
      .select('id, email, role, display_name, created_at')
      .order('email')

    if (usersError) {
      console.error('User fetch error:', usersError)
      console.error('Error details:', {
        code: usersError.code,
        message: usersError.message,
        details: usersError.details,
        hint: usersError.hint
      })
      return [] // Return empty array instead of throwing
    }
    
    console.log('Fetched users:', users)
    
    return users?.map(user => ({
      ...user,
      // Provide fallback display name if not set
      display_name: user.display_name || user.email.split('@')[0]
    })) || []
  } catch (err) {
    console.error('Fetch users error:', err)
    if (err instanceof Error) {
      console.error('Error details:', {
        name: err.name,
        message: err.message,
        stack: err.stack
      })
    }
    return [] // Return empty array instead of throwing
  }
}

// Hook for fetching a single ticket
export function useTicket(id: string) {
  const { data, error, mutate } = useSWR(
    id ? `ticket-${id}` : null,
    () => fetchTicket(id),
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      dedupingInterval: 5000, // Dedupe requests within 5 seconds
    }
  )

  return {
    ticket: data,
    isLoading: !error && !data,
    isError: error,
    mutate,
  }
}

// Update hook for paginated list
export function useTicketList(page = 1, pageSize = PAGE_SIZE) {
  const { data, error, mutate } = useSWR(
    [`tickets`, page, pageSize],
    () => fetchTickets({ page, pageSize }),
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      dedupingInterval: 5000,
    }
  )

  return {
    tickets: data?.tickets || [],
    totalCount: data?.totalCount || 0,
    currentPage: data?.currentPage || page,
    totalPages: data?.totalPages || 0,
    pageSize: data?.pageSize || pageSize,
    isLoading: !error && !data,
    isError: error,
    mutate,
  }
}

// Add users hook
export function useUsers() {
  const { data, error } = useSWR('users', fetchUsers, {
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
    dedupingInterval: 10000,
  })

  return {
    users: data || [],
    isLoading: !error && !data,
    isError: error,
  }
}

// Hook for ticket mutations
export function useTicketMutations() {
  const { mutate: mutateList } = useSWR('tickets')
  const [operationState, setOperationState] = useState({
    isBulkUpdating: false,
    isAssigning: false,
    bulkError: null as string | null,
    assignError: null as string | null,
  })

  const createTicket = async (newTicket: Partial<Ticket>) => {
    const { data, error } = await supabase
      .from('tickets')
      .insert([newTicket])
      .select()
      .single()

    if (error) throw error

    // Revalidate the ticket list
    mutateList()
    return data
  }

  const updateTicket = async (id: string, updates: Partial<Ticket>) => {
    const { data, error } = await supabase
      .from('tickets')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    // Revalidate both the list and the individual ticket
    mutateList()
    await mutate(`ticket-${id}`)
    return data
  }

  const deleteTicket = async (id: string) => {
    const { error } = await supabase
      .from('tickets')
      .delete()
      .eq('id', id)

    if (error) throw error

    // Revalidate the list and remove the individual ticket from cache
    mutateList()
    await mutate(`ticket-${id}`, null)
  }

  const bulkUpdateTickets = async (ids: string[], updates: Partial<Ticket>) => {
    setOperationState(prev => ({ ...prev, isBulkUpdating: true, bulkError: null }))
    try {
      const { error } = await supabase
        .from('tickets')
        .update(updates)
        .in('id', ids)

      if (error) throw error
      mutateList()
      
      // Revalidate individual tickets
      await Promise.all(ids.map(id => mutate(`ticket-${id}`)))
      
      setOperationState(prev => ({ ...prev, isBulkUpdating: false }))
      return { error: null }
    } catch (error) {
      setOperationState(prev => ({ 
        ...prev, 
        isBulkUpdating: false,
        bulkError: error instanceof Error ? error.message : 'Failed to update tickets'
      }))
      return { error: error instanceof Error ? error.message : 'Failed to update tickets' }
    }
  }

  const assignTickets = async (ids: string[], assignee: string | null) => {
    setOperationState(prev => ({ ...prev, isAssigning: true, assignError: null }))
    try {
      const { error } = await supabase
        .from('tickets')
        .update({ assignee })
        .in('id', ids)

      if (error) throw error
      mutateList()
      
      // Revalidate individual tickets
      await Promise.all(ids.map(id => mutate(`ticket-${id}`)))
      
      setOperationState(prev => ({ ...prev, isAssigning: false }))
      return { error: null }
    } catch (error) {
      setOperationState(prev => ({ 
        ...prev, 
        isAssigning: false,
        assignError: error instanceof Error ? error.message : 'Failed to assign tickets'
      }))
      return { error: error instanceof Error ? error.message : 'Failed to assign tickets' }
    }
  }

  return {
    ...operationState,
    createTicket,
    updateTicket,
    deleteTicket,
    bulkUpdateTickets,
    assignTickets,
  }
}

// Hook for ticket activities
export function useTicketActivities(ticketId: string) {
  const { data, error, isLoading, mutate } = useSWR(
    ticketId ? `ticket-activities-${ticketId}` : null,
    () => ticketService.getTicketActivities(ticketId)
  )

  const activities = data?.data || []
  const fetchError = error || data?.error

  return {
    activities,
    error: fetchError,
    isLoading,
    mutate
  }
} 