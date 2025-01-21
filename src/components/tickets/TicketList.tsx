'use client'

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useTickets, useTicketOperation } from '@/lib/context/tickets'
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
import { useTicketList, useTicketMutations, useUsers } from '@/hooks/useTicketData'
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
}

function SortableColumn({ field, children, className }: SortableColumnProps) {
  const { sort, setSort } = useTickets()
  const isActive = sort.field === field
  
  const handleClick = () => {
    if (isActive) {
      // Toggle direction if already sorting by this field
      setSort(field, sort.direction === 'asc' ? 'desc' : 'asc')
    } else {
      // Default to descending for new sort field
      setSort(field, 'desc')
    }
  }

  return (
    <TableHead className={className}>
      <button
        className="flex items-center gap-1 hover:text-foreground/80"
        onClick={handleClick}
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
    isLoading,
    totalCount,
    totalPages,
    pageSize 
  } = useTicketList(currentPage)
  const { users } = useUsers()
  const { 
    updateTicket, 
    deleteTicket, 
    bulkUpdateTickets, 
    assignTickets,
    isBulkUpdating,
    isAssigning,
    bulkError,
    assignError
  } = useTicketMutations()
  const [sort, setSort] = useState<{ field: string; direction: 'asc' | 'desc' }>({
    field: 'created_at',
    direction: 'desc'
  })
  const [statusFilter, setStatusFilter] = useState<string[]>([])
  const [priorityFilter, setPriorityFilter] = useState<string[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedTickets, setSelectedTickets] = useState<Set<string>>(new Set())

  // Filter and sort tickets
  const filteredTickets = useMemo(() => {
    let result = [...tickets]

    // Apply status filter
    if (statusFilter.length > 0) {
      result = result.filter(ticket => statusFilter.includes(ticket.status))
    }

    // Apply priority filter
    if (priorityFilter.length > 0) {
      result = result.filter(ticket => priorityFilter.includes(ticket.priority))
    }

    // Apply search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase()
      result = result.filter(ticket => 
        ticket.title.toLowerCase().includes(search) ||
        ticket.description?.toLowerCase().includes(search)
      )
    }

    // Apply sorting
    result.sort((a, b) => {
      const aValue = a[sort.field as keyof typeof a]
      const bValue = b[sort.field as keyof typeof b]
      
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sort.direction === 'asc' 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue)
      }
      
      return sort.direction === 'asc' 
        ? (aValue as any) - (bValue as any)
        : (bValue as any) - (aValue as any)
    })

    return result
  }, [tickets, statusFilter, priorityFilter, searchTerm, sort])

  // Bulk selection handlers
  const handleSelectAll = () => {
    if (selectedTickets.size === filteredTickets.length) {
      setSelectedTickets(new Set())
    } else {
      setSelectedTickets(new Set(filteredTickets.map(t => t.id)))
    }
  }

  const handleSelectTicket = (id: string) => {
    const newSelected = new Set(selectedTickets)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedTickets(newSelected)
  }

  // Bulk update handler
  const handleBulkStatusUpdate = async (newStatus: typeof TICKET_STATUSES[number]) => {
    const result = await bulkUpdateTickets(Array.from(selectedTickets), { status: newStatus })
    if (!result.error) {
      setSelectedTickets(new Set())
    }
  }

  // Assign handler
  const handleAssign = async (assignee: string | null) => {
    const result = await assignTickets(Array.from(selectedTickets), assignee)
    if (!result.error) {
      setSelectedTickets(new Set())
    }
  }

  const clearFilters = useCallback(() => {
    setStatusFilter([])
    setPriorityFilter([])
    setSearchTerm('')
  }, [])

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    // Scroll to top of list
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  if (isLoading) {
    return <div>Loading tickets...</div>
  }

  return (
    <Card>
      <CardContent className="p-0">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-4">
            <h3 className="text-lg font-semibold">
              Tickets requiring your attention ({filteredTickets.length})
            </h3>
            {selectedTickets.size > 0 && (
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    {selectedTickets.size} selected
                  </span>
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
            )}
          </div>
          <div className="flex items-center gap-4">
            <Input
              placeholder="Search tickets..."
              className="w-64"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Button variant="outline" size="sm" onClick={clearFilters}>
              Clear Filters
            </Button>
          </div>
        </div>

        {bulkError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{bulkError}</AlertDescription>
          </Alert>
        )}
        
        {assignError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{assignError}</AlertDescription>
          </Alert>
        )}

        {/* Filter Controls */}
        <div className="px-4 pb-4 flex gap-4">
          <div className="space-y-2">
            <div className="font-medium text-sm">Status</div>
            <div className="flex gap-2">
              {TICKET_STATUSES.map(status => (
                <Badge
                  key={status}
                  variant={statusFilter.includes(status) ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => {
                    if (statusFilter.includes(status)) {
                      setStatusFilter(statusFilter.filter(s => s !== status))
                    } else {
                      setStatusFilter([...statusFilter, status])
                    }
                  }}
                >
                  {status}
                </Badge>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <div className="font-medium text-sm">Priority</div>
            <div className="flex gap-2">
              {TICKET_PRIORITIES.map(priority => (
                <Badge
                  key={priority}
                  variant={priorityFilter.includes(priority) ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => {
                    if (priorityFilter.includes(priority)) {
                      setPriorityFilter(priorityFilter.filter(p => p !== priority))
                    } else {
                      setPriorityFilter([...priorityFilter, priority])
                    }
                  }}
                >
                  {priority}
                </Badge>
              ))}
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
                  checked={selectedTickets.size === filteredTickets.length}
                  onChange={handleSelectAll}
                />
              </TableHead>
              <SortableColumn field="title">Title</SortableColumn>
              <SortableColumn field="status">Status</SortableColumn>
              <SortableColumn field="priority">Priority</SortableColumn>
              <TableHead>SLA</TableHead>
              <SortableColumn field="created_at">Created</SortableColumn>
              <SortableColumn field="updated_at">Updated</SortableColumn>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredTickets.map((ticket) => (
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