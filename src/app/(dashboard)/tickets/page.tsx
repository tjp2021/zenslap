'use client'

import { Suspense } from 'react'
import TicketList from '@/components/tickets/TicketList'
import TicketListSkeleton from '@/components/tickets/TicketListSkeleton'

export default function TicketsPage() {
  return (
    <div className="container mx-auto py-10">
      <Suspense fallback={<TicketListSkeleton />}>
        <TicketList />
      </Suspense>
    </div>
  )
} 