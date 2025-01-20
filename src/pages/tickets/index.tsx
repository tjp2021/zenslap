"use client"

import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useEffect, useState } from 'react'
import { Ticket } from '@/lib/types'
import Link from 'next/link'
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { supabase } from '@/lib/supabase/client'
import { TICKET_PRIORITIES, TICKET_STATUSES } from '@/lib/types'
import { AlertCircle, ArrowUpDown, Search } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Input } from "@/components/ui/input"

export default function TicketList() {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [priorityFilter, setPriorityFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortField, setSortField] = useState<'created_at' | 'updated_at' | 'priority'>('created_at')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')

  useEffect(() => {
    async function loadTickets() {
      try {
        const response = await fetch('/api/tickets')
        const data = await response.json()
        
        if (data.error) {
          setError(data.error)
        } else {
          setTickets(data.data || [])
        }
      } catch (err) {
        setError('Failed to load tickets')
      } finally {
        setLoading(false)
      }
    }

    loadTickets()

    // Set up real-time subscription
    const subscription = supabase
      .channel('tickets')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'tickets' 
      }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setTickets(prev => [...prev, payload.new as Ticket])
        } else if (payload.eventType === 'UPDATE') {
          setTickets(prev => prev.map(ticket => 
            ticket.id === payload.new.id ? payload.new as Ticket : ticket
          ))
        } else if (payload.eventType === 'DELETE') {
          setTickets(prev => prev.filter(ticket => ticket.id !== payload.old.id))
        }
      })
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const sortedAndFilteredTickets = tickets
    .filter(ticket => {
      const matchesStatus = statusFilter === 'all' || ticket.status === statusFilter
      const matchesPriority = priorityFilter === 'all' || ticket.priority === priorityFilter
      const matchesSearch = searchQuery === '' || 
        ticket.title.toLowerCase().includes(searchQuery.toLowerCase())
      return matchesStatus && matchesPriority && matchesSearch
    })
    .sort((a, b) => {
      if (sortField === 'priority') {
        const priorityOrder = { high: 0, medium: 1, low: 2 }
        const diff = priorityOrder[a.priority] - priorityOrder[b.priority]
        return sortDirection === 'asc' ? diff : -diff
      }
      const aValue = new Date(a[sortField]).getTime()
      const bValue = new Date(b[sortField]).getTime()
      return sortDirection === 'asc' ? aValue - bValue : bValue - aValue
    })

  const toggleSort = (field: 'created_at' | 'updated_at' | 'priority') => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
  }

  if (error) {
    return (
      <Alert variant="destructive" className="m-6">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="min-h-screen bg-[#f5f7f2] p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Tickets</h1>
        <Link href="/tickets/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Ticket
          </Button>
        </Link>
      </div>

      {/* Search and Filters */}
      <div className="flex gap-4 mb-6">
        <div className="w-64">
          <Input
            placeholder="Search tickets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full"
            type="search"
          />
        </div>
        <div className="w-48">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {TICKET_STATUSES.map(status => (
                <SelectItem key={status} value={status}>{status}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="w-48">
          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priorities</SelectItem>
              {TICKET_PRIORITIES.map(priority => (
                <SelectItem key={priority} value={priority}>{priority}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Tickets Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Status</TableHead>
                <TableHead>
                  <Button 
                    variant="ghost" 
                    onClick={() => toggleSort('priority')}
                    className="h-8 flex items-center gap-1"
                  >
                    Priority
                    <ArrowUpDown className="h-4 w-4" />
                  </Button>
                </TableHead>
                <TableHead>Title</TableHead>
                <TableHead>
                  <Button 
                    variant="ghost" 
                    onClick={() => toggleSort('created_at')}
                    className="h-8 flex items-center gap-1"
                  >
                    Created
                    <ArrowUpDown className="h-4 w-4" />
                  </Button>
                </TableHead>
                <TableHead>
                  <Button 
                    variant="ghost" 
                    onClick={() => toggleSort('updated_at')}
                    className="h-8 flex items-center gap-1"
                  >
                    Updated
                    <ArrowUpDown className="h-4 w-4" />
                  </Button>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-48" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                  </TableRow>
                ))
              ) : sortedAndFilteredTickets.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                    No tickets found
                  </TableCell>
                </TableRow>
              ) : (
                sortedAndFilteredTickets.map((ticket) => (
                  <TableRow key={ticket.id}>
                    <TableCell>
                      <Badge variant="secondary" className={
                        ticket.status === 'open' ? 'bg-green-50 text-green-700' :
                        ticket.status === 'in_progress' ? 'bg-blue-50 text-blue-700' :
                        'bg-gray-50 text-gray-700'
                      }>
                        {ticket.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={
                        ticket.priority === 'high' ? 'bg-red-50 text-red-700' :
                        ticket.priority === 'medium' ? 'bg-yellow-50 text-yellow-700' :
                        'bg-gray-50 text-gray-700'
                      }>
                        {ticket.priority}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Link href={`/tickets/${ticket.id}`} className="hover:underline">
                        {ticket.title}
                      </Link>
                    </TableCell>
                    <TableCell>{new Date(ticket.created_at).toLocaleDateString()}</TableCell>
                    <TableCell>{new Date(ticket.updated_at).toLocaleDateString()}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
} 