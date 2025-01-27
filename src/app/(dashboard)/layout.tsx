'use client'

import { useAuth } from '@/lib/hooks/useAuth'
import { TicketsProvider } from '@/lib/context/tickets'
import { memo } from 'react'
import { TopNav } from '@/components/navigation/TopNav'

const MemoizedTicketsProvider = memo(function MemoizedTicketsProvider({
  children
}: {
  children: React.ReactNode
}) {
  return (
    <TicketsProvider>
      <div className="min-h-screen bg-gray-100">
        <TopNav />
        <main className="p-4">
          {children}
        </main>
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