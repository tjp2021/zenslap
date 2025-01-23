'use client'

import { useTicket } from '@/hooks/useTicketData'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { TicketDetails } from '@/components/tickets/TicketDetails'
import { ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/useAuth'
import { ActivityFeed } from '@/components/tickets/TicketActivities/ActivityFeed'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// Create a single QueryClient instance
const queryClient = new QueryClient()

interface TicketDetailsClientProps {
  id: string
}

export default function TicketDetailsClient({ id }: TicketDetailsClientProps) {
  const router = useRouter()
  const { user } = useAuth()
  const { ticket, isLoading: ticketLoading } = useTicket(id)
  
  if (!user || ticketLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <LoadingSpinner />
      </div>
    )
  }

  if (!ticket) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-gray-500">Ticket not found</p>
      </div>
    )
  }

  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="space-y-8">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/tickets')}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Tickets
              </Button>
              <h1 className="text-3xl font-bold text-gray-900">Ticket #{id.slice(0, 8)}</h1>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2">
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                  <TicketDetails id={id} />
                </div>
              </div>

              <div className="lg:col-span-1">
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="space-y-6">
                    <h2 className="text-xl font-semibold text-gray-900">System Activities</h2>
                    <ActivityFeed ticketId={id} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </QueryClientProvider>
  )
} 