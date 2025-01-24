'use client'

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useQuery } from '@tanstack/react-query'
import type { Database } from '@/types/supabase'
import { UserRole } from '@/lib/types'

// Define a simpler user type that matches what we get from the query
export interface StaffUser {
  id: string
  email: string
  role: UserRole
}

export function useStaffUsers() {
  const supabase = createClientComponentClient<Database>()

  const { data: users, isLoading, error } = useQuery({
    queryKey: ['staff-users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('users_secure')
        .select('id, email, role')
        .in('role', ['admin', 'agent'])
        .order('email')

      if (error) throw error
      return data as StaffUser[]
    },
    staleTime: 300000, // Consider data fresh for 5 minutes
    refetchOnWindowFocus: false // Don't refetch on window focus since staff list rarely changes
  })

  return {
    users: users || [],
    isLoading,
    error
  }
} 