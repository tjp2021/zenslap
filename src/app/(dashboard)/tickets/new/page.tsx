'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { CreateTicketForm } from '@/components/tickets/CreateTicketForm'
import { AgentAndAbove } from '@/components/auth/PermissionGate'

export default function NewTicketPage() {
  const router = useRouter()

  return (
    <AgentAndAbove
      fallback={
        <div className="min-h-screen bg-[#f5f7f2] p-6 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow p-6 max-w-md w-full text-center">
            <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
            <p className="text-gray-600 mb-4">You don't have permission to create tickets.</p>
            <Button onClick={() => router.back()}>Go Back</Button>
          </div>
        </div>
      }
    >
      <div className="min-h-screen bg-[#f5f7f2] p-6">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="flex items-center gap-4 mb-6">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => router.back()}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-2xl font-semibold">Create New Ticket</h1>
          </div>

          {/* Main Content */}
          <div className="bg-white rounded-lg shadow p-6">
            <CreateTicketForm />
          </div>
        </div>
      </div>
    </AgentAndAbove>
  )
} 