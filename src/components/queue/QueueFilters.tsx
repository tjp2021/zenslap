'use client'

import { TicketStatus, TicketPriority, TICKET_STATUSES, TICKET_PRIORITIES } from '@/lib/types'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'

interface QueueFiltersProps {
  status?: TicketStatus
  priority?: TicketPriority
  sortBy: 'created_at' | 'priority' | 'updated_at'
  sortOrder: 'asc' | 'desc'
  onStatusChange: (status: TicketStatus | undefined) => void
  onPriorityChange: (priority: TicketPriority | undefined) => void
  onSortChange: (sort: { by: 'created_at' | 'priority' | 'updated_at', order: 'asc' | 'desc' }) => void
}

export function QueueFilters({
  status,
  priority,
  sortBy,
  sortOrder,
  onStatusChange,
  onPriorityChange,
  onSortChange
}: QueueFiltersProps) {
  return (
    <div className="flex gap-4 mb-6">
      <div className="w-48">
        <Label>Status</Label>
        <Select
          value={status || ''}
          onValueChange={(value) => onStatusChange(value as TicketStatus || undefined)}
        >
          <SelectTrigger>
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All</SelectItem>
            {TICKET_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {s.replace('_', ' ').charAt(0).toUpperCase() + s.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="w-48">
        <Label>Priority</Label>
        <Select
          value={priority || ''}
          onValueChange={(value) => onPriorityChange(value as TicketPriority || undefined)}
        >
          <SelectTrigger>
            <SelectValue placeholder="All priorities" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All</SelectItem>
            {TICKET_PRIORITIES.map((p) => (
              <SelectItem key={p} value={p}>
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="w-48">
        <Label>Sort by</Label>
        <Select
          value={`${sortBy}-${sortOrder}`}
          onValueChange={(value) => {
            const [by, order] = value.split('-') as ['created_at' | 'priority' | 'updated_at', 'asc' | 'desc']
            onSortChange({ by, order })
          }}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="created_at-desc">Newest first</SelectItem>
            <SelectItem value="created_at-asc">Oldest first</SelectItem>
            <SelectItem value="priority-desc">Highest priority</SelectItem>
            <SelectItem value="priority-asc">Lowest priority</SelectItem>
            <SelectItem value="updated_at-desc">Recently updated</SelectItem>
            <SelectItem value="updated_at-asc">Least recently updated</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  )
} 