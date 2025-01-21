'use client'

import { Auth } from '@supabase/auth-ui-react'
import { ThemeSupa } from '@supabase/auth-ui-shared'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import type { Database } from '@/lib/supabase/types/supabase'

export function AuthUI() {
  const router = useRouter()
  const supabase = createClientComponentClient<Database>()

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
        router.refresh()
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [router, supabase])

  return (
    <div className="w-full max-w-md mx-auto p-6">
      <Auth
        supabaseClient={supabase}
        appearance={{
          theme: ThemeSupa,
          variables: {
            default: {
              colors: {
                brand: '#2563eb',
                brandAccent: '#1d4ed8',
              },
            },
          },
        }}
        providers={['github']}
        redirectTo={`${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`}
        onlyThirdPartyProviders={false}
        magicLink={true}
        localization={{
          variables: {
            sign_in: {
              email_label: 'Email address',
              password_label: 'Your Password',
            },
          },
        }}
        view="sign_in"
      />
    </div>
  )
} 