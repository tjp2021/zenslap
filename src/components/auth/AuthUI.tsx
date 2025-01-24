'use client'

import { Auth } from '@supabase/auth-ui-react'
import { ThemeSupa } from '@supabase/auth-ui-shared'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '@/types/supabase'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

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
        console.log('↪️ AuthUI - Handling SIGNED_IN, redirecting to callback', {
          siteUrl: SITE_URL
        })
        // Force redirect to callback using SITE_URL
        window.location.href = `${SITE_URL}/auth/callback`
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [router, supabase.auth])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md p-8 space-y-4 bg-white rounded-lg shadow-md">
        <h2 className="text-2xl font-bold text-center text-gray-900 mb-8">
          Welcome Back
        </h2>
        <Auth
          supabaseClient={supabase}
          view="sign_in"
          redirectTo={`${SITE_URL}/auth/callback`}
          appearance={{
            theme: ThemeSupa,
            variables: {
              default: {
                colors: {
                  brand: '#2563eb',
                  brandAccent: '#1d4ed8'
                }
              }
            },
            className: {
              container: 'w-full',
              button: 'w-full px-4 py-2 text-white bg-blue-600 hover:bg-blue-700 rounded transition-colors',
              input: 'w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent'
            }
          }}
          theme="default"
          providers={['github']}
        />
      </div>
    </div>
  )
} 