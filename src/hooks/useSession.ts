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
export const roleAtom = atom(
  (get) => {
    const session = get(sessionAtom)
    return session?.user?.user_metadata?.db_role as UserRole || null
  }
)

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
    
    async function initSession() {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (session?.user) {
        // Get role from users_secure table
        const { data: userData } = await supabase
          .from('users_secure')
          .select('role')
          .eq('id', session.user.id)
          .single()
        
        if (userData) {
          // Store the database role in metadata for easy access
          await supabase.auth.updateUser({
            data: { db_role: userData.role }
          })
          
          // Update session with new metadata
          const { data: { session: updatedSession } } = await supabase.auth.getSession()
          setSession(updatedSession)
        } else {
          setSession(session)
        }
      }
      
      setIsLoading(false)
    }

    initSession()

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        // Get role from users_secure table
        const { data: userData } = await supabase
          .from('users_secure')
          .select('role')
          .eq('id', session.user.id)
          .single()
        
        if (userData) {
          // Store the database role in metadata
          await supabase.auth.updateUser({
            data: { db_role: userData.role }
          })
          
          // Get updated session with new metadata
          const { data: { session: updatedSession } } = await supabase.auth.getSession()
          setSession(updatedSession)
        } else {
          setSession(session)
        }
      } else {
        setSession(session)
      }
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