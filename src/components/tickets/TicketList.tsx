'use client'

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useTickets } from '@/lib/context/tickets'
import { Input } from "@/components/ui/input"
import { TICKET_STATUSES, TICKET_PRIORITIES } from '@/lib/types'
import { ArrowUpDown, ArrowUp, ArrowDown, UserPlus, AlertCircle } from "lucide-react"
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

export default function TicketList() {
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
  const { 
    bulkUpdateTickets, 
    assignTickets,
    isBulkUpdating,
    isAssigning,
    bulkError,
    assignError
  } = useTicketMutations()
  const [selectedTickets, setSelectedTickets] = useState<Set<string>>(new Set())

  const pageSize = 20 // Match the previous PAGE_SIZE
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
    const result = await bulkUpdateTickets(Array.from(selectedTickets), { status: newStatus })
    if (!result.error) {
      setSelectedTickets(new Set())
    }
  }, [bulkUpdateTickets, selectedTickets])

  // Assign handler
  const handleAssign = useCallback(async (assignee: string | null) => {
    const result = await assignTickets(Array.from(selectedTickets), assignee)
    if (!result.error) {
      setSelectedTickets(new Set())
    }
  }, [assignTickets, selectedTickets])

  if (loading) {
    return <div>Loading tickets...</div>
  }

  return (
    <Card>
      <CardContent className="p-6">
        {/* Bulk Actions */}
        {selectedTickets.size > 0 && (
          <div className="mb-4 p-4 border rounded-lg bg-muted/50">
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">
                {selectedTickets.size} selected
              </span>
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

              <div className="flex items-center gap-2 border-l pl-4">
                <Select
                  onValueChange={(value) => handleAssign(value === 'unassign' ? null : value)}
                  disabled={isAssigning}
                >
                  <SelectTrigger className="w-[180px]">
                    <div className="flex items-center gap-2">
                      <UserPlus className="h-4 w-4" />
                      <SelectValue placeholder={isAssigning ? "Assigning..." : "Assign to..."} />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    {users.map(user => (
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
            </div>
          </div>
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
          {/* Search */}
          <Input
            placeholder="Search tickets..."
            className="max-w-sm"
            onChange={(e) => setSearchFilter(e.target.value)}
          />

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
              <TableHead className="w-12">
                <input 
                  type="checkbox" 
                  className="rounded border-gray-300"
                  checked={selectedTickets.size === currentTickets.length}
                  onChange={handleSelectAll}
                />
              </TableHead>
              <SortableColumn field="title" onClick={(direction) => setSort('title', direction)}>Title</SortableColumn>
              <SortableColumn field="status" onClick={(direction) => setSort('status', direction)}>Status</SortableColumn>
              <SortableColumn field="priority" onClick={(direction) => setSort('priority', direction)}>Priority</SortableColumn>
              <TableHead>SLA</TableHead>
              <SortableColumn field="created_at" onClick={(direction) => setSort('created_at', direction)}>Created</SortableColumn>
              <SortableColumn field="updated_at" onClick={(direction) => setSort('updated_at', direction)}>Updated</SortableColumn>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {currentTickets.map((ticket) => (
              <TableRow key={ticket.id}>
                <TableCell>
                  <input 
                    type="checkbox" 
                    className="rounded border-gray-300"
                    checked={selectedTickets.has(ticket.id)}
                    onChange={() => handleSelectTicket(ticket.id)}
                  />
                </TableCell>
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
                  <SLAIndicator ticket={ticket} />
                </TableCell>
                <TableCell>{new Date(ticket.created_at).toLocaleString()}</TableCell>
                <TableCell>{new Date(ticket.updated_at).toLocaleString()}</TableCell>
                <TableCell>
                  {/* ... existing actions ... */}
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