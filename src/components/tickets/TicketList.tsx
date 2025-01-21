'use client'

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useTickets, useTicketOperation } from '@/lib/context/tickets'
import { Input } from "@/components/ui/input"
import { TICKET_STATUSES, TICKET_PRIORITIES } from '@/lib/types'
import { ArrowUpDown, ArrowUp, ArrowDown, UserPlus } from "lucide-react"
import { useState } from "react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

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
  const { 
    filteredTickets, 
    loadTickets,
    filters,
    setStatusFilter,
    setPriorityFilter,
    setSearchFilter,
    clearFilters,
    bulkUpdateTickets,
    assignTickets,
    users
  } = useTickets()
  const { isLoading, isError, error } = useTicketOperation('load')
  const { 
    isLoading: isBulkUpdating,
    isError: isBulkError,
    error: bulkError 
  } = useTicketOperation('bulk_update')
  const {
    isLoading: isAssigning,
    isError: isAssignError,
    error: assignError
  } = useTicketOperation('assign')
  const [selectedTickets, setSelectedTickets] = useState<Set<string>>(new Set())

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

  if (isLoading) {
    return <div>Loading tickets...</div>
  }

  if (isError) {
    return (
      <div className="p-4 text-red-500 bg-red-50 rounded-md">
        {error}
        <Button 
          variant="outline" 
          size="sm" 
          onClick={loadTickets}
          className="ml-4"
        >
          Retry
        </Button>
      </div>
    )
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
              value={filters.search || ''}
              onChange={(e) => setSearchFilter(e.target.value)}
            />
            <Button variant="outline" size="sm" onClick={clearFilters}>
              Clear Filters
            </Button>
          </div>
        </div>

        {isBulkError && (
          <div className="p-4 text-red-500 bg-red-50">
            {bulkError}
          </div>
        )}

        {isAssignError && (
          <div className="p-4 text-red-500 bg-red-50">
            {assignError}
          </div>
        )}

        {/* Filter Controls */}
        <div className="px-4 pb-4 flex gap-4">
          <div className="space-y-2">
            <div className="font-medium text-sm">Status</div>
            <div className="flex gap-2">
              {TICKET_STATUSES.map(status => (
                <Badge
                  key={status}
                  variant={filters.selected.status.has(status) ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => {
                    const newStatuses = new Set(filters.selected.status)
                    if (newStatuses.has(status)) {
                      newStatuses.delete(status)
                    } else {
                      newStatuses.add(status)
                    }
                    setStatusFilter(Array.from(newStatuses))
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
                  variant={filters.selected.priority.has(priority) ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => {
                    const newPriorities = new Set(filters.selected.priority)
                    if (newPriorities.has(priority)) {
                      newPriorities.delete(priority)
                    } else {
                      newPriorities.add(priority)
                    }
                    setPriorityFilter(Array.from(newPriorities))
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
              <SortableColumn field="status">Status</SortableColumn>
              <TableHead>ID</TableHead>
              <SortableColumn field="title" className="max-w-[500px]">Subject</SortableColumn>
              <TableHead>Requester</TableHead>
              <SortableColumn field="updated_at">Last Updated</SortableColumn>
              <SortableColumn field="priority">Priority</SortableColumn>
              <TableHead>Assignee</TableHead>
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