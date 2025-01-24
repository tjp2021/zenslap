'use client'

import { useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useRouter } from 'next/navigation'
import { type Session } from '@supabase/supabase-js'
import { atom, useAtom } from 'jotai'
import { UserRole } from '@/lib/types'

// Core atoms
const sessionAtom = atom<Session | null>(null)
const loadingAtom = atom<boolean>(true)

// Derived role atom
export const roleAtom = atom((get) => {
  const session = get(sessionAtom)
  const role = session?.user?.user_metadata?.role
  return role ? (role.toUpperCase() as UserRole) : null
})

// Initialize session once at app level
let initialized = false

export function useSession() {
  const [session, setSession] = useAtom(sessionAtom)
  const [isLoading, setIsLoading] = useAtom(loadingAtom)
  const router = useRouter()
  const supabase = createClientComponentClient()

  useEffect(() => {
    if (initialized) return

    initialized = true
    
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