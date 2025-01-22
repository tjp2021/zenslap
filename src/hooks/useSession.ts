'use client'

import { useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useRouter } from 'next/navigation'
import { type Session } from '@supabase/supabase-js'
import { atom, useAtom } from 'jotai'

const sessionAtom = atom<Session | null>(null)
const loadingAtom = atom<boolean>(true)

export function useSession() {
  const [session, setSession] = useAtom(sessionAtom)
  const [isLoading, setIsLoading] = useAtom(loadingAtom)
  const router = useRouter()
  const supabase = createClientComponentClient()

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setIsLoading(false)
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      router.refresh()
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [supabase, setSession, router, setIsLoading])

  return {
    session,
    isLoading,
  }
} 