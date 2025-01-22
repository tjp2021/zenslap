'use client'

import { useAuth } from '@/lib/hooks/useAuth'
import { TicketsProvider } from '@/lib/context/tickets'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, loading } = useAuth()

  if (loading) {
    return <div>Loading...</div>
  }

  if (!user) {
    return null
  }

  return (
    <TicketsProvider>
      <div className="min-h-screen bg-gray-100">
        {children}
      </div>
    </TicketsProvider>
  )
} 