'use client'

import { useCallback, useEffect } from 'react'
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

  // Debug logging
  useEffect(() => {
    console.log('🔑 useRoleAccess Debug:', {
      session: {
        id: session?.user?.id,
        email: session?.user?.email,
        metadata: session?.user?.user_metadata,
      },
      role,
      isLoading
    })
  }, [session, role, isLoading])

  const hasRole = useCallback((requiredRoles: UserRole | UserRole[]): boolean => {
    if (!role) {
      console.log('❌ hasRole check failed: No role found')
      return false
    }
    
    const roles = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles]
    
    // Debug the actual values
    console.log('🔍 Role Check Values:', {
      userRole: role,
      requiredRoles: roles,
      roleType: typeof role,
      requiredType: roles.map(r => typeof r)
    })
    
    // Admin has access to everything
    if (role === UserRole.ADMIN) {
      console.log('✅ hasRole check passed: User is admin')
      return true
    }
    
    // Convert role strings to lowercase for comparison
    const normalizedRole = role.toLowerCase()
    const normalizedRequiredRoles = roles.map(r => 
      typeof r === 'string' ? r.toLowerCase() : r
    )
    
    const hasAccess = normalizedRequiredRoles.includes(normalizedRole)
    console.log('🔍 hasRole check:', { 
      normalizedRole, 
      normalizedRequiredRoles, 
      hasAccess 
    })
    return hasAccess
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