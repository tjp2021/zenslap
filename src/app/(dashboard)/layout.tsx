'use client'

import { useAuth } from '@/lib/hooks/useAuth'
import { TicketsProvider } from '@/lib/context/tickets'
import { memo } from 'react'

const MemoizedTicketsProvider = memo(function MemoizedTicketsProvider({
  children
}: {
  children: React.ReactNode
}) {
  return (
    <TicketsProvider>
      <div className="min-h-screen bg-gray-100">
        {children}
      </div>
    </TicketsProvider>
  )
})

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

  return <MemoizedTicketsProvider>{children}</MemoizedTicketsProvider>
} 