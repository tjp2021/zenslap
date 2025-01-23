'use client'

import { Auth } from '@supabase/auth-ui-react'
import { ThemeSupa } from '@supabase/auth-ui-shared'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '@/types/supabase'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function AuthUI() {
  const supabase = createClientComponentClient<Database>()
  const router = useRouter()

  useEffect(() => {
    // Check initial session state
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.error('❌ AuthUI - Session Check Error:', {
          error: error.message,
          timestamp: new Date().toISOString()
        })
        return
      }
      
      console.log('🔐 AuthUI - Initial Session Check:', {
        hasSession: !!session,
        userId: session?.user?.id,
        email: session?.user?.email,
        timestamp: new Date().toISOString()
      })
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('🔄 AuthUI - Auth State Change:', {
        event,
        hasSession: !!session,
        userId: session?.user?.id,
        email: session?.user?.email,
        timestamp: new Date().toISOString()
      })

      if (event === 'SIGNED_IN' && session) {
        console.log('↪️ AuthUI - Handling SIGNED_IN, redirecting to callback')
        // Force redirect to callback
        window.location.href = `${window.location.origin}/auth/callback`
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [supabase.auth])

  return (
    <Auth
      supabaseClient={supabase}
      view="sign_in"
      appearance={{ theme: ThemeSupa }}
      theme="dark"
      showLinks={false}
      providers={[]}
      redirectTo={`${window.location.origin}/auth/callback`}
    />
  )
} 