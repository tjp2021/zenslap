'use client'

import { Plus, Search, Ticket, ListOrdered, BarChart3 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { SignOutButton } from '@/components/auth/SignOutButton'
import { AgentAndAbove, AdminOnly } from '@/components/auth/PermissionGate'
import { NotificationBell } from '@/components/notifications/NotificationBell'
import Link from 'next/link'
import { Settings } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"

export function TopNav() {
  return (
    <header className="border-b bg-white">
      <div className="flex h-16 items-center px-4 gap-4">
        <AgentAndAbove>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="shrink-0">
                <Plus className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              <DropdownMenuItem asChild>
                <Link href="/tickets" className="flex items-center gap-2">
                  <Ticket className="h-4 w-4" />
                  <span>Tickets</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/queue" className="flex items-center gap-2">
                  <ListOrdered className="h-4 w-4" />
                  <span>Queue</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/reports" className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  <span>Reports</span>
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </AgentAndAbove>
        <div className="flex-1" />
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="icon">
            <Search className="h-4 w-4" />
          </Button>
          <NotificationBell />
          <AdminOnly>
            <Link href="/settings">
              <Button variant="ghost" size="icon">
                <Settings className="h-4 w-4" />
              </Button>
            </Link>
          </AdminOnly>
          <SignOutButton />
        </div>
      </div>
    </header>
  )
} 