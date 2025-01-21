'use client'

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useEffect, useState } from 'react'
import type { Database } from '@/lib/supabase/types/supabase'
import type { Ticket } from '@/lib/types'
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

export default function TicketList() {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClientComponentClient<Database>()

  useEffect(() => {
    async function loadTickets() {
      try {
        const { data, error } = await supabase
          .from('tickets')
          .select('*')
          .order('created_at', { ascending: false })

        if (error) throw error
        setTickets(data || [])
      } catch (error) {
        console.error('Error loading tickets:', error)
      } finally {
        setLoading(false)
      }
    }

    loadTickets()

    // Set up realtime subscription
    const channel = supabase
      .channel('tickets')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'tickets' },
        (payload) => {
          console.log('Change received!', payload)
          loadTickets() // Reload tickets when changes occur
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase])

  if (loading) {
    return <div>Loading tickets...</div>
  }

  return (
    <Card>
      <CardContent className="p-0">
        <div className="flex items-center justify-between p-4">
          <h3 className="text-lg font-semibold">Tickets requiring your attention ({tickets.length})</h3>
          <Button variant="outline" size="sm">
            Play
          </Button>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <input type="checkbox" className="rounded border-gray-300" />
              </TableHead>
              <TableHead>Status</TableHead>
              <TableHead>ID</TableHead>
              <TableHead className="max-w-[500px]">Subject</TableHead>
              <TableHead>Requester</TableHead>
              <TableHead>Last Updated</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Assignee</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tickets.map((ticket) => (
              <TableRow key={ticket.id}>
                <TableCell>
                  <input type="checkbox" className="rounded border-gray-300" />
                </TableCell>
                <TableCell>
                  <Badge
                    variant="secondary"
                    className={
                      ticket.status === 'open' 
                        ? 'bg-red-50 text-red-700 hover:bg-red-50 hover:text-red-700'
                        : ticket.status === 'in_progress'
                        ? 'bg-yellow-50 text-yellow-700 hover:bg-yellow-50 hover:text-yellow-700'
                        : 'bg-green-50 text-green-700 hover:bg-green-50 hover:text-green-700'
                    }
                  >
                    {ticket.status}
                  </Badge>
                </TableCell>
                <TableCell>#{ticket.id}</TableCell>
                <TableCell className="max-w-[500px] truncate">{ticket.title}</TableCell>
                <TableCell>{ticket.created_by}</TableCell>
                <TableCell>
                  {new Date(ticket.updated_at || ticket.created_at).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="capitalize">
                    {ticket.priority}
                  </Badge>
                </TableCell>
                <TableCell>{ticket.assigned_to || 'Unassigned'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
} 