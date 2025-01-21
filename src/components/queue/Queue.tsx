'use client'

import { useState } from 'react'
import { TicketStatus, TicketPriority } from '@/lib/types'
import { QueueList } from './QueueList'
import { QueueFilters } from './QueueFilters'

export function Queue() {
  const [status, setStatus] = useState<TicketStatus | undefined>(undefined)
  const [priority, setPriority] = useState<TicketPriority | undefined>(undefined)
  const [sort, setSort] = useState<{
    by: 'created_at' | 'priority' | 'updated_at'
    order: 'asc' | 'desc'
  }>({
    by: 'created_at',
    order: 'desc'
  })

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6">Ticket Queue</h2>
      
      <QueueFilters
        status={status}
        priority={priority}
        sortBy={sort.by}
        sortOrder={sort.order}
        onStatusChange={setStatus}
        onPriorityChange={setPriority}
        onSortChange={setSort}
      />

      <QueueList
        status={status}
        priority={priority}
        sortBy={sort.by}
        sortOrder={sort.order}
      />
    </div>
  )
} 