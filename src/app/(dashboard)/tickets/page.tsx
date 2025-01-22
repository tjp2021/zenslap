'use client'

import { Suspense } from 'react'
import { Bell, Plus, Search } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import TicketList from '@/components/tickets/TicketList'
import TicketListSkeleton from '@/components/tickets/TicketListSkeleton'
import { SignOutButton } from '@/components/auth/SignOutButton'
import { OpenTicketsCounter } from '@/components/tickets/OpenTicketsCounter'
import { TicketStatistics } from '@/components/tickets/TicketStatistics'
import { TicketUpdates } from '@/components/tickets/TicketUpdates'

export default function TicketsPage() {
  return (
    <div className="min-h-screen bg-[#f5f7f2]">
      {/* Header */}
      <header className="border-b bg-white">
        <div className="flex h-16 items-center px-4 gap-4">
          <Button variant="outline" size="icon" className="shrink-0">
            <Plus className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <nav className="flex items-center space-x-4">
              <a href="#" className="text-sm text-muted-foreground">
                Trial home
              </a>
              <a href="#" className="text-sm border-b-2 border-[#4a9d76] text-[#2d6847] font-medium">
                Dashboard
              </a>
            </nav>
          </div>
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="icon">
              <Search className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon">
              <Bell className="h-4 w-4" />
            </Button>
            <SignOutButton />
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className="w-80 border-r bg-white p-4 min-h-[calc(100vh-4rem)]">
          <h2 className="text-lg font-semibold mb-4">Updates to your tickets</h2>
          <TicketUpdates />
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6">
          {/* Statistics */}
          <div className="grid gap-6 md:grid-cols-2 mb-6">
            <OpenTicketsCounter />
            <TicketStatistics />
          </div>

          <Suspense fallback={<TicketListSkeleton />}>
            <TicketList />
          </Suspense>
        </main>
      </div>
    </div>
  )
} 