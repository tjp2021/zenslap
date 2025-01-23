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
      console.log('🔥 STAFF USERS HOOK: Starting fetch...')
      setIsLoading(true)
      setError(null)

      // First get current user's role
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      if (sessionError) throw sessionError
      
      if (!session) {
        throw new Error('No session')
      }

      // Get all users - the RLS policy will handle filtering
      const { data, error: fetchError } = await supabase
        .from('users_secure')
        .select('id, email, role')
        .in('role', ['admin', 'agent']) // Only get staff users
        .order('email')

      console.log('🔥 STAFF USERS HOOK: Raw query result:', { 
        success: !fetchError,
        data: data || [], 
        error: fetchError,
        count: data?.length || 0,
        roles: data?.map(u => u.role) || []
      })

      if (fetchError) throw fetchError

      setUsers(data || [])
      console.log('🔥 STAFF USERS HOOK: State updated with users:', data || [])
    } catch (err) {
      console.error('🔥 STAFF USERS HOOK: Error:', err)
      setError(err as Error)
    } finally {
      setIsLoading(false)
      console.log('🔥 STAFF USERS HOOK: Loading finished')
    }
  }, [supabase])

  useEffect(() => {
    console.log('🔥 STAFF USERS HOOK: Mounted, triggering fetch')
    fetchStaffUsers()
  }, [fetchStaffUsers])

  console.log('🔥 STAFF USERS HOOK: Rendering with state:', { users, isLoading, error })
  return { users, isLoading, error, refetch: fetchStaffUsers }
} 