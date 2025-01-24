'use client'

import { useMemo } from 'react'
import { useSession } from '@/hooks/useSession'
import { UserRole } from '@/lib/types'
import { useAtom } from 'jotai'
import { roleAtom } from './useSession'

interface RoleAccess {
  hasRole: (roles: UserRole | UserRole[]) => boolean
  isAdmin: boolean
  isAgent: boolean
  isUser: boolean
  role: UserRole | null
  isLoading: boolean
}

export function useRoleAccess(): RoleAccess {
  const { isLoading } = useSession()
  const [role] = useAtom(roleAtom)

  // Memoize role checks
  const roleChecks = useMemo(() => {
    const isAdmin = role === UserRole.ADMIN
    const isAgent = role === UserRole.AGENT
    const isUser = role === UserRole.USER

    const hasRole = (requiredRoles: UserRole | UserRole[]): boolean => {
      if (!role) return false
      if (isAdmin) return true

      const roles = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles]
      return roles.includes(role)
    }

    return {
      hasRole,
      isAdmin,
      isAgent,
      isUser
    }
  }, [role])

  return {
    ...roleChecks,
    role,
    isLoading
  }
} 