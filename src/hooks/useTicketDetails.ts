'use client'

import { useState, useEffect } from 'react'
import { Ticket } from '@/lib/types'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useToast } from '@/components/ui/use-toast'

export function useTicketDetails(ticketId: string) {
  const [ticket, setTicket] = useState<Ticket | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClientComponentClient()
  const { toast } = useToast()

  useEffect(() => {
    async function fetchTicket() {
      try {
        const { data, error } = await supabase
          .from('tickets')
          .select('*')
          .eq('id', ticketId)
          .single()

        if (error) throw error

        setTicket(data)
        setError(null)
      } catch (error) {
        console.error('Error fetching ticket:', error)
        setError('Failed to load ticket')
        toast({
          title: 'Error',
          description: 'Failed to load ticket details',
          variant: 'destructive',
        })
      } finally {
        setLoading(false)
      }
    }

    fetchTicket()
  }, [ticketId, supabase, toast])

  return {
    ticket,
    loading,
    error,
  }
} 