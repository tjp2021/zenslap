'use client'

import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { TicketsProvider } from '@/lib/context/tickets'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const cookieStore = cookies()
  const supabase = createServerComponentClient({ cookies: () => cookieStore })
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    redirect('/auth/login')
  }

  return (
    <TicketsProvider>
      <div className="min-h-screen bg-background">
        <div className="flex-1">{children}</div>
      </div>
    </TicketsProvider>
  )
} 