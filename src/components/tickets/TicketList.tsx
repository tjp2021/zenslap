'use client'

import React from 'react'
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useTickets } from '@/lib/context/tickets'
import { Input } from "@/components/ui/input"
import { TICKET_STATUSES, TICKET_PRIORITIES, type User, type Ticket } from '@/lib/types'
import { ArrowUpDown, ArrowUp, ArrowDown, UserPlus, AlertCircle, Clock } from "lucide-react"
import { useState, useMemo, useCallback } from "react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { SLAIndicator } from './SLAIndicator'
import { useTicketMutations, useUsers } from '@/hooks/useTicketData'
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { AgentAndAbove } from '@/components/auth/PermissionGate'
import { can, TicketActions } from '@/lib/permissions'
import { useAuth } from '@/lib/hooks/useAuth'
import { TicketActions as NewTicketActions } from './TicketActions'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { SLACalculator } from '@/lib/services/SLACalculator'
import { formatDistanceToNow } from 'date-fns'
import { cn } from '@/lib/utils'

interface SortableColumnProps {
  field: 'created_at' | 'updated_at' | 'priority' | 'status' | 'title'
  children: React.ReactNode
  className?: string
  onClick?: (direction: 'asc' | 'desc') => void
}

function SortableColumn({ field, children, className, onClick }: SortableColumnProps) {
  const { sort, setSort: setSortContext } = useTickets()
  const isActive = sort.field === field
  
  const handleClick = () => {
    if (isActive) {
      // Toggle direction if already sorting by this field
      setSortContext(field, sort.direction === 'asc' ? 'desc' : 'asc')
    } else {
      // Default to descending for new sort field
      setSortContext(field, 'desc')
    }
  }

  return (
    <TableHead className={className}>
      <button
        className="flex items-center gap-1 hover:text-foreground/80"
        onClick={() => {
          handleClick()
          if (onClick) {
            onClick(sort.direction)
          }
        }}
      >
        {children}
        <span className="ml-1">
          {isActive ? (
            sort.direction === 'asc' ? (
              <ArrowUp className="h-4 w-4" />
            ) : (
              <ArrowDown className="h-4 w-4" />
            )
          ) : (
            <ArrowUpDown className="h-4 w-4 opacity-50" />
          )}
        </span>
      </button>
    </TableHead>
  )
}

function CreateTicketButton() {
  return (
    <Link href="/tickets/new" passHref>
      <Button>
        Create Ticket
      </Button>
    </Link>
  )
}

const SLAColumn = React.memo(function SLAColumn({ ticket }: { ticket: Ticket }) {
  const slaCalculator = new SLACalculator()
  const deadline = slaCalculator.getSLADeadline(ticket)
  const isOverdue = new Date() > deadline
  const timeLeft = formatDistanceToNow(deadline, { addSuffix: true })

  return (
    <div className="flex items-center gap-2">
      <Badge variant={isOverdue ? "destructive" : "outline"} className="whitespace-nowrap">
        <Clock className={cn(
          "h-4 w-4 mr-1",
          isOverdue ? "text-white" : "text-gray-500"
        )} />
        <span>
          {isOverdue ? "Overdue" : "Due"} {timeLeft}
        </span>
      </Badge>
    </div>
  )
})

export default function TicketList() {
  const router = useRouter()
  const { user } = useAuth() as { user: User | null }
  const [currentPage, setCurrentPage] = useState(1)
  const { 
    tickets,
    loading,
    loadTickets,
    setStatusFilter,
    setPriorityFilter,
    setSearchFilter,
    setSort,
  } = useTickets()
  const { users } = useUsers()
  const { updateTicket } = useTicketMutations()
  const [selectedTickets, setSelectedTickets] = useState<Set<string>>(new Set())
  const [isBulkUpdating, setIsBulkUpdating] = useState(false)
  const [isAssigning, setIsAssigning] = useState(false)
  const [bulkError, setBulkError] = useState<string | null>(null)
  const [assignError, setAssignError] = useState<string | null>(null)

  const pageSize = 20
  const totalCount = tickets.length
  const totalPages = Math.ceil(totalCount / pageSize)

  // Get current page of tickets
  const currentTickets = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    const end = start + pageSize
    return tickets.slice(start, end)
  }, [tickets, currentPage, pageSize])

  // Bulk selection handlers
  const handleSelectAll = useCallback(() => {
    if (selectedTickets.size === currentTickets.length) {
      setSelectedTickets(new Set())
    } else {
      setSelectedTickets(new Set(currentTickets.map(t => t.id)))
    }
  }, [currentTickets, selectedTickets.size])

  const handleSelectTicket = useCallback((ticketId: string) => {
    setSelectedTickets(prev => {
      const next = new Set(prev)
      if (next.has(ticketId)) {
        next.delete(ticketId)
      } else {
        next.add(ticketId)
      }
      return next
    })
  }, [])

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page)
  }, [])

  // Bulk update handler
  const handleBulkStatusUpdate = useCallback(async (newStatus: typeof TICKET_STATUSES[number]) => {
    setIsBulkUpdating(true)
    setBulkError(null)
    try {
      await Promise.all(
        Array.from(selectedTickets).map(id => 
          updateTicket(id, { status: newStatus })
        )
      )
      setSelectedTickets(new Set())
    } catch (error) {
      setBulkError(error instanceof Error ? error.message : 'Failed to update tickets')
    } finally {
      setIsBulkUpdating(false)
    }
  }, [updateTicket, selectedTickets])

  // Assign handler
  const handleAssign = useCallback(async (assigneeId: string | null) => {
    setIsAssigning(true)
    setAssignError(null)
    try {
      const updates = await Promise.all(
        Array.from(selectedTickets).map(id => 
          updateTicket(id, { assignee: assigneeId })
        )
      )
      setSelectedTickets(new Set())
    } catch (error) {
      setAssignError(error instanceof Error ? error.message : 'Failed to assign tickets')
    } finally {
      setIsAssigning(false)
    }
  }, [updateTicket, selectedTickets])

  // Check if user can perform bulk actions
  const canBulkUpdate = useCallback((tickets: string[]) => {
    return tickets.every(id => {
      const ticket = currentTickets.find(t => t.id === id)
      return ticket && can(TicketActions.EDIT_STATUS, user, ticket)
    })
  }, [currentTickets, user])

  const canAssign = useCallback((tickets: string[]) => {
    return tickets.every(id => {
      const ticket = currentTickets.find(t => t.id === id)
      return ticket && can(TicketActions.EDIT_ASSIGNEE, user, ticket)
    })
  }, [currentTickets, user])

  const renderCheckboxCell = useCallback((ticket: Ticket) => {
    if (!user) return null;
    
    return (
      <TableCell>
        <input 
          type="checkbox" 
          className="rounded border-gray-300"
          checked={selectedTickets.has(ticket.id)}
          onChange={() => handleSelectTicket(ticket.id)}
        />
      </TableCell>
    );
  }, [handleSelectTicket, selectedTickets]);

  // Add navigation handler
  const handleRowClick = (ticketId: string) => {
    router.push(`/tickets/${ticketId}`)
  }

  if (loading) {
    return <div>Loading tickets...</div>
  }

  return (
    <Card>
      <CardContent className="p-6">
        {/* Bulk Actions */}
        {selectedTickets.size > 0 && (
          <AgentAndAbove>
            <div className="mb-4 p-4 border rounded-lg bg-muted/50">
              <div className="flex items-center gap-4">
                <span className="text-sm text-muted-foreground">
                  {selectedTickets.size} selected
                </span>
                {canBulkUpdate(Array.from(selectedTickets)) && (
                  <div className="flex items-center gap-2">
                    {TICKET_STATUSES.map(status => (
                      <Button
                        key={status}
                        variant="outline"
                        size="sm"
                        onClick={() => handleBulkStatusUpdate(status)}
                        disabled={isBulkUpdating}
                      >
                        {isBulkUpdating ? 'Updating...' : `Set ${status}`}
                      </Button>
                    ))}
                  </div>
                )}

                {canAssign(Array.from(selectedTickets)) && (
                  <div className="flex items-center gap-2 border-l pl-4">
                    <Select
                      onValueChange={handleAssign}
                      disabled={isAssigning}
                    >
                      <SelectTrigger className="w-[180px]">
                        <div className="flex items-center gap-2">
                          <UserPlus className="h-4 w-4" />
                          <SelectValue placeholder={isAssigning ? "Assigning..." : "Assign to..."} />
                        </div>
                      </SelectTrigger>
                      <SelectContent>
                        {users?.map((user) => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.email}
                          </SelectItem>
                        ))}
                        <SelectItem value="unassign" className="border-t mt-2">
                          Unassign
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </div>
          </AgentAndAbove>
        )}

        {/* Error Messages */}
        {bulkError && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{bulkError}</AlertDescription>
          </Alert>
        )}
        
        {assignError && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{assignError}</AlertDescription>
          </Alert>
        )}

        {/* Filters */}
        <div className="space-y-4 mb-4">
          {/* Search and Create Ticket */}
          <div className="flex justify-between items-center">
            <Input
              placeholder="Search tickets..."
              className="max-w-sm"
              onChange={(e) => setSearchFilter(e.target.value)}
            />
            <CreateTicketButton />
          </div>

          {/* Filter badges */}
          <div className="flex gap-4">
            <div>
              <div className="text-sm font-medium mb-2">Status</div>
              <div className="flex gap-2">
                {TICKET_STATUSES.map(status => (
                  <Badge
                    key={status}
                    variant="outline"
                    className="cursor-pointer"
                    onClick={() => setStatusFilter([status])}
                  >
                    {status}
                  </Badge>
                ))}
              </div>
            </div>

            <div>
              <div className="text-sm font-medium mb-2">Priority</div>
              <div className="flex gap-2">
                {TICKET_PRIORITIES.map(priority => (
                  <Badge
                    key={priority}
                    variant="outline"
                    className="cursor-pointer"
                    onClick={() => setPriorityFilter([priority])}
                  >
                    {priority}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              {user && (
                <TableHead className="w-12">
                  <input 
                    type="checkbox" 
                    className="rounded border-gray-300"
                    checked={selectedTickets.size === currentTickets.length}
                    onChange={handleSelectAll}
                  />
                </TableHead>
              )}
              <SortableColumn field="title">Title</SortableColumn>
              <SortableColumn field="status">Status</SortableColumn>
              <SortableColumn field="priority">Priority</SortableColumn>
              <TableHead className="font-semibold">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  SLA Deadline
                </div>
              </TableHead>
              <SortableColumn field="created_at">Created</SortableColumn>
              <SortableColumn field="updated_at">Updated</SortableColumn>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {currentTickets.map((ticket) => (
              <TableRow 
                key={ticket.id}
                onClick={() => handleRowClick(ticket.id)}
                className="cursor-pointer hover:bg-gray-50"
              >
                {renderCheckboxCell(ticket)}
                <TableCell>{ticket.title}</TableCell>
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
                <TableCell>
                  <Badge variant={
                    ticket.priority === 'high' ? 'destructive' :
                    ticket.priority === 'medium' ? 'secondary' :
                    'default'
                  }>
                    {ticket.priority}
                  </Badge>
                </TableCell>
                <TableCell>
                  <SLAColumn ticket={ticket} />
                </TableCell>
                <TableCell>{new Date(ticket.created_at).toLocaleString()}</TableCell>
                <TableCell>{new Date(ticket.updated_at).toLocaleString()}</TableCell>
                <TableCell>
                  {user && (
                    <NewTicketActions
                      ticket={ticket}
                      onEdit={() => router.push(`/tickets/${ticket.id}`)}
                      onDelete={async () => {
                        try {
                          await updateTicket(ticket.id, { status: 'closed' })
                        } catch (error) {
                          console.error('Failed to close ticket:', error)
                        }
                      }}
                      onAssign={async (userId) => {
                        try {
                          await updateTicket(ticket.id, { assignee: userId })
                        } catch (error) {
                          console.error('Failed to assign ticket:', error)
                        }
                      }}
                    />
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {/* Pagination Controls */}
        <div className="py-4 px-4 border-t">
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, totalCount)} of {totalCount} tickets
            </div>
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious 
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1} 
                  />
                </PaginationItem>
                
                {/* First page */}
                <PaginationItem>
                  <PaginationLink
                    onClick={() => handlePageChange(1)}
                    isActive={currentPage === 1}
                  >
                    1
                  </PaginationLink>
                </PaginationItem>

                {/* Show ellipsis if needed */}
                {currentPage > 3 && (
                  <PaginationItem>
                    <PaginationEllipsis />
                  </PaginationItem>
                )}

                {/* Pages around current page */}
                {Array.from({ length: 3 }, (_, i) => {
                  const page = currentPage - 1 + i
                  if (page <= 1 || page >= totalPages) return null
                  return (
                    <PaginationItem key={page}>
                      <PaginationLink
                        onClick={() => handlePageChange(page)}
                        isActive={currentPage === page}
                      >
                        {page}
                      </PaginationLink>
                    </PaginationItem>
                  )
                })}

                {/* Show ellipsis if needed */}
                {currentPage < totalPages - 2 && (
                  <PaginationItem>
                    <PaginationEllipsis />
                  </PaginationItem>
                )}

                {/* Last page */}
                {totalPages > 1 && (
                  <PaginationItem>
                    <PaginationLink
                      onClick={() => handlePageChange(totalPages)}
                      isActive={currentPage === totalPages}
                    >
                      {totalPages}
                    </PaginationLink>
                  </PaginationItem>
                )}

                <PaginationItem>
                  <PaginationNext
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        </div>
      </CardContent>
    </Card>
  )
} 