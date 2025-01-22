'use client'

import { useAuth } from '@/lib/hooks/useAuth'
import { TicketsProvider } from '@/lib/context/tickets'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login')
    }
  }, [user, loading, router])

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