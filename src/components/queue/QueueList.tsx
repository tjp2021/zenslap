'use client'

import { useEffect, useState, useCallback } from 'react'
import { Ticket, TicketStatus, TicketPriority } from '@/lib/types'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/lib/hooks/useAuth'

interface QueueListProps {
  status?: TicketStatus
  priority?: TicketPriority
  assignee?: string
  sortBy?: 'created_at' | 'priority' | 'updated_at'
  sortOrder?: 'asc' | 'desc'
}

export function QueueList({ 
  status, 
  priority, 
  assignee,
  sortBy = 'created_at',
  sortOrder = 'desc'
}: QueueListProps) {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClientComponentClient()
  const { user } = useAuth()

  const fetchTickets = useCallback(async () => {
    setLoading(true)
    setError(null)
    
    try {
      let query = supabase
        .from('tickets')
        .select(`
          *,
          tags (*),
          messages (
            id,
            content,
            created_at,
            created_by
          )
        `)
        .order(sortBy, { ascending: sortOrder === 'asc' })
      
      if (status) {
        query = query.eq('status', status)
      }
      if (priority) {
        query = query.eq('priority', priority)
      }
      if (assignee) {
        query = query.eq('assignee', assignee)
      }

      const { data, error: fetchError } = await query

      if (fetchError) {
        throw new Error(fetchError.message)
      }
      
      if (data) {
        setTickets(data as Ticket[])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch tickets')
    } finally {
      setLoading(false)
    }
  }, [supabase, sortBy, sortOrder, status, priority, assignee])

  useEffect(() => {
    fetchTickets()
    
    const channel = supabase
      .channel('tickets')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tickets' }, () => {
        fetchTickets()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchTickets, supabase])

  const handleAssign = async (ticketId: string) => {
    try {
      const { error: updateError } = await supabase
        .from('tickets')
        .update({ assignee: user?.id })
        .eq('id', ticketId)

      if (updateError) {
        throw new Error(updateError.message)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to assign ticket')
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="p-4 border rounded-lg">
            <Skeleton className="h-6 w-3/4 mb-2" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-4">
      {tickets.map((ticket) => (
        <div 
          key={ticket.id}
          className="p-4 border rounded-lg hover:bg-gray-50"
        >
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-medium">{ticket.title}</h3>
              <p className="text-sm text-gray-600">{ticket.description}</p>
            </div>
            {!ticket.assignee && user?.id && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleAssign(ticket.id)}
              >
                Assign to me
              </Button>
            )}
          </div>
          
          <div className="mt-2 flex gap-2">
            <span className="text-xs px-2 py-1 rounded-full bg-blue-100">
              {ticket.status}
            </span>
            <span className="text-xs px-2 py-1 rounded-full bg-yellow-100">
              {ticket.priority}
            </span>
            {ticket.tags?.map((tag) => (
              <span 
                key={tag.id}
                className="text-xs px-2 py-1 rounded-full"
                style={{ backgroundColor: tag.color || '#e5e7eb' }}
              >
                {tag.name}
              </span>
            ))}
          </div>
          
          {ticket.messages && ticket.messages.length > 0 && (
            <div className="mt-2 text-sm text-gray-500">
              Last message: {ticket.messages[ticket.messages.length - 1].content}
            </div>
          )}
        </div>
      ))}
    </div>
  )
} 