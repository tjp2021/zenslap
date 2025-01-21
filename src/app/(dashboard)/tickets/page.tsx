'use client'

import { Suspense } from 'react'
import { Bell, Plus, Search } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import TicketList from '@/components/tickets/TicketList'
import TicketListSkeleton from '@/components/tickets/TicketListSkeleton'

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
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className="w-80 border-r bg-white p-4 min-h-[calc(100vh-4rem)]">
          <h2 className="text-lg font-semibold mb-4">Updates to your tickets</h2>
          <div className="space-y-4">
            {updates.map((update, i) => (
              <div key={i} className="p-3 border rounded-lg">
                <p className="text-sm">
                  <span className="font-medium">Zendesk</span> {update.action} {update.ticket}
                </p>
                <p className="text-xs text-muted-foreground">less than a minute ago</p>
              </div>
            ))}
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6">
          {/* Statistics */}
          <div className="grid gap-6 md:grid-cols-2 mb-6">
            <Card>
              <CardContent className="p-4">
                <h3 className="text-sm font-medium mb-2">Open Tickets (current)</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-[#f8faf6] rounded-lg">
                    <div className="text-2xl font-bold text-[#2d6847]">5</div>
                    <div className="text-sm text-muted-foreground">YOU</div>
                  </div>
                  <div className="text-center p-4 bg-[#f8faf6] rounded-lg">
                    <div className="text-2xl font-bold text-[#2d6847]">5</div>
                    <div className="text-sm text-muted-foreground">GROUPS</div>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <h3 className="text-sm font-medium mb-2">Ticket Statistics (this week)</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-[#f8faf6] rounded-lg">
                    <div className="text-2xl font-bold text-[#2d6847]">0</div>
                    <div className="text-sm text-muted-foreground">GOOD</div>
                  </div>
                  <div className="text-center p-4 bg-[#f8faf6] rounded-lg">
                    <div className="text-2xl font-bold text-[#2d6847]">0</div>
                    <div className="text-sm text-muted-foreground">BAD</div>
                  </div>
                  <div className="text-center p-4 bg-[#f8faf6] rounded-lg">
                    <div className="text-2xl font-bold text-[#2d6847]">0</div>
                    <div className="text-sm text-muted-foreground">SOLVED</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Suspense fallback={<TicketListSkeleton />}>
            <TicketList />
          </Suspense>
        </main>
      </div>
    </div>
  )
}

const updates = [
  {
    action: "assigned you",
    ticket: '"SAMPLE TICKET: Do I put it together?"',
  },
  {
    action: "increased the priority on",
    ticket: '"SAMPLE TICKET: Do I put it together?"',
  },
  {
    action: "assigned you",
    ticket: '"SAMPLE TICKET: Shipping cost"',
  },
] 