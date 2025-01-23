'use client'

import { createContext, useContext, ReactNode, useState, useEffect, useMemo, useCallback } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '@/lib/supabase/types/supabase'
import type { Ticket, CreateTicketDTO, UpdateTicketDTO } from '@/lib/types'
import type { SupabaseClient } from '@supabase/supabase-js'
import { useAuth } from '@/lib/hooks/useAuth'
import { ErrorBoundary } from '@/components/error/ErrorBoundary'

type OperationType = 'create' | 'update' | 'delete' | 'load' | 'bulk_update' | 'assign'
type OperationStatus = 'idle' | 'loading' | 'success' | 'error'

interface OperationState {
  type: OperationType
  status: OperationStatus
  id?: string
  error?: string
}

// Sort types
type SortField = 'created_at' | 'updated_at' | 'priority' | 'status' | 'title'
type SortDirection = 'asc' | 'desc'

interface SortConfig {
  field: SortField
  direction: SortDirection
}

interface TicketFilters {
  selected: {
    status: Set<string>
    priority: Set<string>
  }
  search?: string
}

export interface TicketsContextType {
  tickets: Ticket[]
  filteredTickets: Ticket[]
  operations: OperationState[]
  filters: TicketFilters
  sort: SortConfig
  users: { id: string; email: string }[]
  setStatusFilter: (statuses: string[]) => void
  setPriorityFilter: (priorities: string[]) => void
  setSearchFilter: (search: string) => void
  setSort: (field: SortField, direction: SortDirection) => void
  clearFilters: () => void
  loadTickets: () => Promise<void>
  loadUsers: () => Promise<void>
  createTicket: (data: CreateTicketDTO) => Promise<{ error: string | null }>
  updateTicket: (data: UpdateTicketDTO) => Promise<{ error: string | null }>
  deleteTicket: (id: string) => Promise<{ error: string | null }>
  getOperationState: (type: OperationType, id?: string) => OperationState | undefined
  bulkUpdateTickets: (ids: string[], updates: Partial<UpdateTicketDTO>) => Promise<{ error: string | null }>
  assignTickets: (ids: string[], assignee: string | null) => Promise<{ error: string | null }>
  loading: boolean
}

const defaultFilters: TicketFilters = {
  selected: {
    status: new Set(),
    priority: new Set()
  }
}

const defaultSort: SortConfig = {
  field: 'created_at',
  direction: 'desc'
}

const TicketsContext = createContext<TicketsContextType | undefined>(undefined)

function TicketsProviderContent({ 
  children,
  supabaseClient
}: { 
  children: ReactNode
  supabaseClient?: SupabaseClient
}) {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [users, setUsers] = useState<{ id: string; email: string }[]>([])
  const [operations, setOperations] = useState<OperationState[]>([])
  const [filters, setFilters] = useState<TicketFilters>(defaultFilters)
  const [sort, setSort] = useState<SortConfig>(defaultSort)
  const [loading, setLoading] = useState(false)
  const { user } = useAuth()

  // Create a stable supabase client
  const supabase = useMemo(() => 
    supabaseClient || createClientComponentClient<Database>(),
    [supabaseClient]
  )

  // Memoize loadTickets to prevent recreation
  const loadTickets = useCallback(async () => {
    if (!user) {
      setTickets([])
      return
    }

    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('tickets')
        .select('*')
        .order('created_at', { ascending: false })
      
      if (error) {
        throw new Error(`Failed to load tickets: ${error.message}`)
      }

      setTickets(data || [])
    } catch (err) {
      console.error('Error loading tickets:', err)
      throw err
    } finally {
      setLoading(false)
    }
  }, [supabase, user?.id]) // Only depend on user.id, not the entire user object

  // Memoize loadUsers to prevent recreation
  const loadUsers = useCallback(async () => {
    if (!user) {
      setUsers([])
      return
    }

    try {
      const { data, error } = await supabase
        .from('users_secure')
        .select('*')
      
      if (error) throw error
      setUsers(data || [])
    } catch (err) {
      console.error('Error loading users:', err)
    }
  }, [supabase, user?.id]) // Only depend on user.id

  // Load data when user changes
  useEffect(() => {
    if (user?.id) {
      loadTickets()
      loadUsers()
    }
  }, [user?.id, loadTickets, loadUsers]) // Only depend on user.id

  // Memoized filtered and sorted tickets
  const filteredAndSortedTickets = useMemo(() => {
    // First apply filters
    const filtered = tickets.filter(ticket => {
      // Status filter
      if (filters.selected.status.size > 0 && !filters.selected.status.has(ticket.status)) {
        return false
      }
      
      // Priority filter
      if (filters.selected.priority.size > 0 && !filters.selected.priority.has(ticket.priority)) {
        return false
      }

      // Search filter
      if (filters.search) {
        const search = filters.search.toLowerCase()
        return (
          ticket.title.toLowerCase().includes(search) ||
          ticket.description.toLowerCase().includes(search) ||
          ticket.created_by.toLowerCase().includes(search)
        )
      }

      return true
    })

    // Then sort
    return [...filtered].sort((a, b) => {
      const { field, direction } = sort
      const modifier = direction === 'asc' ? 1 : -1

      switch (field) {
        case 'created_at':
        case 'updated_at':
          return (new Date(a[field]).getTime() - new Date(b[field]).getTime()) * modifier
        
        case 'priority': {
          const priorityOrder = { low: 0, medium: 1, high: 2 }
          return (priorityOrder[a.priority] - priorityOrder[b.priority]) * modifier
        }

        case 'status': {
          const statusOrder = { open: 0, in_progress: 1, closed: 2 }
          return (statusOrder[a.status] - statusOrder[b.status]) * modifier
        }

        default:
          return a[field].localeCompare(b[field]) * modifier
      }
    })
  }, [tickets, filters, sort])

  // Update sort
  const handleSort = (field: SortField, direction: SortDirection) => {
    setSort({ field, direction })
  }

  // Filter setters
  const setStatusFilter = (statuses: string[]) => {
    setFilters(prev => ({
      ...prev,
      selected: {
        ...prev.selected,
        status: new Set(statuses)
      }
    }))
  }

  const setPriorityFilter = (priorities: string[]) => {
    setFilters(prev => ({
      ...prev,
      selected: {
        ...prev.selected,
        priority: new Set(priorities)
      }
    }))
  }

  const setSearchFilter = (search: string) => {
    setFilters(prev => ({
      ...prev,
      search
    }))
  }

  const clearFilters = () => {
    setFilters(defaultFilters)
  }

  const updateOperationState = (
    type: OperationType,
    status: OperationStatus,
    id?: string,
    error?: string
  ) => {
    setOperations(prev => {
      // Remove existing operation of same type and id
      const filtered = prev.filter(op => 
        !(op.type === type && (id ? op.id === id : true))
      )
      
      // Add new operation state if not idle
      return status === 'idle' 
        ? filtered 
        : [...filtered, { type, status, id, error }]
    })
  }

  const getOperationState = (type: OperationType, id?: string) => {
    return operations.find(op => op.type === type && (id ? op.id === id : true))
  }

  async function createTicket(data: CreateTicketDTO) {
    try {
      updateOperationState('create', 'loading')
      const { error } = await supabase
        .from('tickets')
        .insert([{
          ...data,
          status: data.status || 'open',
          priority: data.priority || 'medium',
          metadata: data.metadata || {}
        }])

      if (error) throw error
      await loadTickets()
      
      updateOperationState('create', 'success')
      return { error: null }
    } catch (error) {
      console.error('Error creating ticket:', error)
      const errorMessage = 'Failed to create ticket. Please try again.'
      updateOperationState('create', 'error', undefined, errorMessage)
      return { error: errorMessage }
    }
  }

  async function updateTicket(data: UpdateTicketDTO) {
    try {
      updateOperationState('update', 'loading', data.id)
      const { error } = await supabase
        .rpc('update_ticket_with_activity', {
          p_ticket_id: data.id,
          p_updates: data,
          p_actor_id: user?.id
        })

      if (error) throw error
      await loadTickets()
      
      updateOperationState('update', 'success', data.id)
      return { error: null }
    } catch (error) {
      console.error('Error updating ticket:', error)
      const errorMessage = 'Failed to update ticket. Please try again.'
      updateOperationState('update', 'error', data.id, errorMessage)
      return { error: errorMessage }
    }
  }

  async function deleteTicket(id: string) {
    try {
      updateOperationState('delete', 'loading', id)
      const { error } = await supabase
        .from('tickets')
        .delete()
        .eq('id', id)

      if (error) throw error
      await loadTickets()
      
      updateOperationState('delete', 'success', id)
      return { error: null }
    } catch (error) {
      console.error('Error deleting ticket:', error)
      const errorMessage = 'Failed to delete ticket. Please try again.'
      updateOperationState('delete', 'error', id, errorMessage)
      return { error: errorMessage }
    }
  }

  async function bulkUpdateTickets(ids: string[], updates: Partial<UpdateTicketDTO>) {
    try {
      updateOperationState('bulk_update', 'loading')
      
      // Update each ticket individually using the RPC function
      const promises = ids.map(id => 
        supabase.rpc('update_ticket_with_activity', {
          p_ticket_id: id,
          p_updates: updates,
          p_actor_id: user?.id
        })
      )
      
      const results = await Promise.all(promises)
      const errors = results.filter(r => r.error).map(r => r.error)
      
      if (errors.length > 0) throw errors[0]
      await loadTickets()
      
      updateOperationState('bulk_update', 'success')
      return { error: null }
    } catch (error) {
      console.error('Error bulk updating tickets:', error)
      const errorMessage = 'Failed to update tickets. Please try again.'
      updateOperationState('bulk_update', 'error', undefined, errorMessage)
      return { error: errorMessage }
    }
  }

  async function assignTickets(ids: string[], assignee: string | null) {
    try {
      updateOperationState('assign', 'loading')
      const { error } = await supabase
        .from('tickets')
        .update({ assignee })
        .in('id', ids)

      if (error) throw error
      await loadTickets()
      
      updateOperationState('assign', 'success')
      return { error: null }
    } catch (error) {
      console.error('Error assigning tickets:', error)
      const errorMessage = 'Failed to assign tickets. Please try again.'
      updateOperationState('assign', 'error', undefined, errorMessage)
      return { error: errorMessage }
    }
  }

  const value = {
    tickets: filteredAndSortedTickets,
    filteredTickets: filteredAndSortedTickets,
    operations,
    filters,
    sort,
    users,
    setStatusFilter,
    setPriorityFilter,
    setSearchFilter,
    setSort: handleSort,
    clearFilters,
    loadTickets,
    loadUsers,
    createTicket,
    updateTicket,
    deleteTicket,
    getOperationState,
    bulkUpdateTickets,
    assignTickets,
    loading
  }

  return (
    <TicketsContext.Provider value={value}>
      {children}
    </TicketsContext.Provider>
  )
}

export function TicketsProvider({ 
  children,
  supabaseClient
}: { 
  children: ReactNode
  supabaseClient?: SupabaseClient
}) {
  return (
    <ErrorBoundary
      fallback={
        <div className="p-4 rounded-md bg-yellow-50 border border-yellow-200">
          <h2 className="text-lg font-semibold text-yellow-800">Unable to load tickets</h2>
          <p className="mt-2 text-sm text-yellow-700">
            There was a problem loading your tickets. Please try refreshing the page.
          </p>
        </div>
      }
    >
      <TicketsProviderContent supabaseClient={supabaseClient}>
        {children}
      </TicketsProviderContent>
    </ErrorBoundary>
  )
}

export function useTickets() {
  const context = useContext(TicketsContext)
  if (context === undefined) {
    throw new Error('useTickets must be used within a TicketsProvider')
  }
  return context
}

// Helper hooks for components
export function useTicketOperation(type: OperationType, id?: string) {
  const { getOperationState } = useTickets()
  const operation = getOperationState(type, id)
  
  return {
    isLoading: operation?.status === 'loading',
    isError: operation?.status === 'error',
    error: operation?.error,
    isSuccess: operation?.status === 'success',
    isIdle: !operation || operation.status === 'idle',
  }
} 