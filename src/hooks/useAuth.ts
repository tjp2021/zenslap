'use client'

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useEffect, useState } from 'react'
import type { User } from '@/lib/types'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClientComponentClient()

  useEffect(() => {
    const getUser = async () => {
      const { data: { session }, error } = await supabase.auth.getSession()
      
      if (error) {
        console.error('Error fetching session:', error)
        setUser(null)
        setLoading(false)
        return
      }

      if (session?.user) {
        // Convert Supabase user to our User type
        const appUser: User = {
          id: session.user.id,
          email: session.user.email || '',
          role: session.user.user_metadata.role || 'USER',
          created_at: session.user.created_at,
        }
        setUser(appUser)
      } else {
        setUser(null)
      }
      setLoading(false)
    }

    // Initial fetch
    getUser()

    // Subscribe to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        const appUser: User = {
          id: session.user.id,
          email: session.user.email || '',
          role: session.user.user_metadata.role || 'USER',
          created_at: session.user.created_at,
        }
        setUser(appUser)
      } else {
        setUser(null)
      }
      setLoading(false)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [supabase])

  return { user, loading }
} 