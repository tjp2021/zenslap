'use client'

import dynamic from 'next/dynamic'
import { useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useRouter } from 'next/navigation'
import type { Database } from '@/types/supabase'

// Dynamically import AuthUI to avoid hydration issues
const AuthUI = dynamic(() => import('@/components/auth/AuthUI'), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-full max-w-md p-8 space-y-4">
        <div className="h-8 bg-gray-200 rounded animate-pulse" />
        <div className="space-y-3">
          <div className="h-4 bg-gray-200 rounded animate-pulse" />
          <div className="h-4 bg-gray-200 rounded animate-pulse w-5/6" />
        </div>
      </div>
    </div>
  )
})

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClientComponentClient<Database>()

  useEffect(() => {
    console.log('🔍 LoginPage - Checking session')
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.error('❌ LoginPage - Session Check Error:', {
          error: error.message,
          timestamp: new Date().toISOString()
        })
        return
      }

      console.log('🔐 LoginPage - Session Check:', {
        hasSession: !!session,
        userId: session?.user?.id,
        email: session?.user?.email,
        timestamp: new Date().toISOString()
      })

      if (session) {
        console.log('↪️ LoginPage - Redirecting to /tickets')
        router.replace('/tickets')
      }
    })
  }, [router, supabase.auth])

  return <AuthUI />
} 