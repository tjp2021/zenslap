'use client'

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useEffect, useState } from 'react'
import type { User } from '@/lib/types'
import { UserRole } from '@/lib/types'

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
        // Get user role from users_secure table
        const { data: userData, error: userError } = await supabase
          .from('users_secure')
          .select('role')
          .eq('id', session.user.id)
          .single()

        if (userError) {
          console.error('Error fetching user role:', userError)
          setUser(null)
          setLoading(false)
          return
        }

        // Convert Supabase user to our User type
        const appUser: User = {
          id: session.user.id,
          email: session.user.email || '',
          role: userData?.role || UserRole.USER,
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
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        // Get user role from users_secure table
        const { data: userData, error: userError } = await supabase
          .from('users_secure')
          .select('role')
          .eq('id', session.user.id)
          .single()

        if (userError) {
          console.error('Error fetching user role:', userError)
          setUser(null)
          setLoading(false)
          return
        }

        const appUser: User = {
          id: session.user.id,
          email: session.user.email || '',
          role: userData?.role || UserRole.USER,
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