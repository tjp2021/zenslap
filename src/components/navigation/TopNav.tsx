import { Bell, Plus, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { SignOutButton } from '@/components/auth/SignOutButton'
import { AgentAndAbove } from '@/components/auth/PermissionGate'
import Link from 'next/link'

export function TopNav() {
  return (
    <header className="border-b bg-white">
      <div className="flex h-16 items-center px-4 gap-4">
        <AgentAndAbove>
          <Button variant="outline" size="icon" className="shrink-0">
            <Plus className="h-4 w-4" />
          </Button>
        </AgentAndAbove>
        <div className="flex-1">
          <nav className="flex items-center">
            <Link href="/tickets" className="text-sm border-b-2 border-[#4a9d76] text-[#2d6847] font-medium">
              Dashboard
            </Link>
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
  )
} 