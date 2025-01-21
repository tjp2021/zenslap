import { Suspense } from 'react'
import { TicketDetails } from '@/components/tickets/TicketDetails'
import { TicketDetailsSkeleton } from '@/components/tickets/TicketDetailsSkeleton'

export default async function TicketPage({ params }: { params: { id: string } }) {
  return (
    <div className="min-h-screen bg-[#f5f7f2] p-6">
      <div className="max-w-2xl mx-auto">
        <Suspense fallback={<TicketDetailsSkeleton />}>
          <TicketDetails id={params.id} />
        </Suspense>
      </div>
    </div>
  )
} 