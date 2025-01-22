'use client'

import { Auth } from '@supabase/auth-ui-react'
import { ThemeSupa } from '@supabase/auth-ui-shared'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'

export default function AuthUI() {
  const router = useRouter()

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
        router.refresh()
        router.push('/tickets')
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
      />
    </div>
  )
} 