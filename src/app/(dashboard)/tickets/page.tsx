'use client'

import { Suspense } from 'react'
import { Plus } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import TicketList from '@/components/tickets/TicketList'
import TicketListSkeleton from '@/components/tickets/TicketListSkeleton'
import { OpenTicketsCounter } from '@/components/tickets/OpenTicketsCounter'
import { TicketStatistics } from '@/components/tickets/TicketStatistics'
import { TicketUpdates } from '@/components/tickets/TicketUpdates'
import { useRouter } from 'next/navigation'
import { AgentAndAbove } from '@/components/auth/PermissionGate'

export default function TicketsPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-[#f5f7f2]">
      <div className="flex">
        {/* Sidebar */}
        <aside className="w-80 border-r bg-white p-4 min-h-[calc(100vh-4rem)] flex flex-col">
          <h2 className="text-lg font-semibold mb-4">Updates to your tickets</h2>
          <TicketUpdates />
          <div className="mt-auto">
            <Button 
              className="w-full flex items-center gap-2 bg-[#4a9d76] hover:bg-[#2d6847]"
              onClick={() => router.push('/tickets/new')}
            >
              <Plus className="h-4 w-4" />
              Create a Ticket
            </Button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6">
          {/* Statistics */}
          <div className="grid gap-6 md:grid-cols-2 mb-6">
            <OpenTicketsCounter />
            <AgentAndAbove>
              <TicketStatistics />
            </AgentAndAbove>
          </div>

          <Suspense fallback={<TicketListSkeleton />}>
            <TicketList />
          </Suspense>
        </main>
      </div>
    </div>
  )
} 