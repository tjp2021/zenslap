'use client'

import useSWR from 'swr'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { UserRole } from '@/lib/types'
import { useSession } from './useSession'

interface StaffUser {
  id: string
  email: string
  role: UserRole
}

export function useStaffUsers() {
  const supabase = createClientComponentClient()
  const { session } = useSession()

  console.log('🔍 DEBUG: useStaffUsers hook called')

  const { data, error } = useSWR(
    // Only fetch if we have a session, and use session ID as part of key
    session ? ['staff-users', session.user.id] : null,
    async () => {
      console.log('🔍 DEBUG: Starting staff users fetch')
      
      // First verify session with app_metadata
      console.log('🔍 DEBUG: Current session:', {
        user: session?.user?.email,
        role: session?.user?.user_metadata?.role,
        id: session?.user?.id,
        metadata: session?.user?.app_metadata
      })

      // Use exact string values from database
      const roles = ['admin', 'agent']
      console.log('🔍 DEBUG: Querying for roles:', roles)

      const { data, error } = await supabase
        .from('users_secure')
        .select('id, email, role')
        .in('role', roles)
        .order('email')

      // Detailed response logging
      console.log('🔍 DEBUG: Query complete:', {
        success: !error,
        error: error?.message,
        errorCode: error?.code,
        dataReceived: !!data,
        userCount: data?.length || 0,
        firstUser: data?.[0],
        roles: data?.map(u => u.role)
      })

      if (error) throw error
      return data || []
    }, {
      revalidateOnFocus: false,
      dedupingInterval: 60000 // Cache for 1 minute
    }
  )

  return {
    users: data || [],
    isLoading: !error && !data,
    error
  }
} 