import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { Ticket } from '@/lib/types'
import Link from 'next/link'

export default function TicketList() {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    async function loadTickets() {
      const { data, error } = await supabase
        .from('tickets')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        setError(error.message)
      } else {
        setTickets(data || [])
      }
      setLoading(false)
    }

    loadTickets()
  }, [])

  if (loading) return <div>Loading...</div>
  if (error) return <div>Error: {error}</div>

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Tickets</h1>
        <Link href="/tickets/new">
          <button>Create Ticket</button>
        </Link>
      </div>
      <div>
        {tickets.length === 0 ? (
          <p>No tickets found</p>
        ) : (
          tickets.map(ticket => (
            <div key={ticket.id} style={{ marginBottom: '1rem', padding: '1rem', border: '1px solid #ccc' }}>
              <h3>{ticket.title}</h3>
              <p>{ticket.description}</p>
              <div>Status: {ticket.status}</div>
              <div>Priority: {ticket.priority}</div>
            </div>
          ))
        )}
      </div>
    </div>
  )
} 