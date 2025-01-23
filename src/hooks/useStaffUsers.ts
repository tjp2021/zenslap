'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { UserRole } from '@/lib/types'

interface StaffUser {
  id: string
  email: string
  role: UserRole
}

export function useStaffUsers() {
  const [users, setUsers] = useState<StaffUser[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const supabase = createClientComponentClient()

  const fetchStaffUsers = useCallback(async () => {
    try {
      console.log('🔍 DEBUG: Starting staff users fetch')
      setIsLoading(true)
      setError(null)

      // First verify session with app_metadata
      const { data: { session } } = await supabase.auth.getSession()
      console.log('🔍 DEBUG: Current session:', {
        user: session?.user?.email,
        role: session?.user?.app_metadata?.role,
        id: session?.user?.id,
        metadata: session?.user?.app_metadata
      })

      // Use exact string values from database
      const roles = ['admin', 'agent']
      console.log('🔍 DEBUG: Querying for roles:', roles)

      const { data, error: fetchError } = await supabase
        .from('users_secure')
        .select('id, email, role')
        .in('role', roles)
        .order('email')

      // Detailed response logging
      console.log('🔍 DEBUG: Query complete:', {
        success: !fetchError,
        error: fetchError?.message,
        errorCode: fetchError?.code,
        dataReceived: !!data,
        userCount: data?.length || 0,
        firstUser: data?.[0],
        roles: data?.map(u => u.role)
      })

      if (fetchError) throw fetchError
      
      setUsers(data || [])
      console.log('🔍 DEBUG: State updated with users:', data?.length || 0)
    } catch (err) {
      console.error('🔍 DEBUG: Error in useStaffUsers:', err)
      setError(err as Error)
      setUsers([])
    } finally {
      setIsLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    console.log('🔍 DEBUG: useStaffUsers mounted, fetching...')
    fetchStaffUsers()
  }, [fetchStaffUsers])

  return { users, isLoading, error, refetch: fetchStaffUsers }
} 