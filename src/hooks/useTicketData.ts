import useSWR, { mutate } from 'swr'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Ticket } from '@/lib/types'
import { useAuth } from '@/lib/hooks/useAuth'

const PAGE_SIZE = 20

// Fetcher functions
const fetchTickets = async ({ page = 1, pageSize = PAGE_SIZE, filters = {} }) => {
  const params = new URLSearchParams({
    ...filters,
    page: String(page),
    pageSize: String(pageSize)
  })
  
  const res = await fetch(`/api/tickets?${params}`)
  if (!res.ok) throw new Error('Failed to fetch tickets')
  return res.json()
}

const fetchTicket = async (id: string) => {
  const res = await fetch(`/api/tickets/${id}`)
  if (!res.ok) throw new Error('Failed to fetch ticket')
  return res.json()
}

// Fetcher for users
const fetchUsers = async () => {
  const res = await fetch('/api/users')
  if (!res.ok) throw new Error('Failed to fetch users')
  return res.json()
}

// Hook for paginated list
export function useTicketList(page = 1, pageSize = PAGE_SIZE, filters = {}) {
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

// Hook for single ticket
export function useTicket(id: string) {
  const { data, error, mutate } = useSWR(
    id ? `ticket-${id}` : null,
    () => fetchTicket(id),
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      dedupingInterval: 5000,
    }
  )

  return {
    ticket: data,
    isLoading: !error && !data,
    isError: error,
    mutate,
  }
}

// Hook for mutations
export function useTicketMutations() {
  const createTicket = async (ticket: Omit<Ticket, 'id' | 'created_at'>) => {
    const res = await fetch('/api/tickets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(ticket)
    })
    if (!res.ok) throw new Error('Failed to create ticket')
    const data = await res.json()
    await mutate('tickets')
    return data
  }

  const updateTicket = async (id: string, updates: Partial<Ticket>) => {
    const res = await fetch(`/api/tickets`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...updates })
    })
    if (!res.ok) throw new Error('Failed to update ticket')
    const data = await res.json()
    await Promise.all([
      mutate('tickets'),
      mutate(`ticket-${id}`)
    ])
    return data
  }

  const bulkUpdateTickets = async (ids: string[], updates: Partial<Ticket>) => {
    const res = await fetch('/api/tickets/bulk', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids, updates })
    })
    if (!res.ok) throw new Error('Failed to bulk update tickets')
    const data = await res.json()
    await mutate('tickets')
    return data
  }

  return {
    createTicket,
    updateTicket,
    bulkUpdateTickets,
  }
}

// Hook for fetching users
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

// Hook for ticket activities
export function useTicketActivities(ticketId: string) {
  const { data, error, isLoading, mutate } = useSWR(
    ticketId ? `ticket-activities-${ticketId}` : null,
    async () => {
      const res = await fetch(`/api/tickets/${ticketId}/activities`)
      if (!res.ok) throw new Error('Failed to fetch ticket activities')
      return res.json()
    }
  )

  return {
    activities: data?.activities || [],
    error,
    isLoading,
    mutate
  }
} 