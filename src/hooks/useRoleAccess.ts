'use client'

import { useCallback } from 'react'
import { useSession } from '@/hooks/useSession'
import { UserRole } from '@/lib/types'

interface RoleAccess {
  hasRole: (roles: UserRole | UserRole[]) => boolean
  isAdmin: boolean
  isAgent: boolean
  isUser: boolean
  role: UserRole | null
  isLoading: boolean
}

export function useRoleAccess(): RoleAccess {
  const { session, isLoading } = useSession()
  const role = session?.user?.user_metadata?.role as UserRole | null

  const hasRole = useCallback((requiredRoles: UserRole | UserRole[]): boolean => {
    if (!role) return false
    
    const roles = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles]
    
    // Admin has access to everything
    if (role === UserRole.ADMIN) return true
    
    return roles.includes(role)
  }, [role])

  return {
    hasRole,
    isAdmin: role === UserRole.ADMIN,
    isAgent: role === UserRole.AGENT,
    isUser: role === UserRole.USER,
    role,
    isLoading
  }
} 