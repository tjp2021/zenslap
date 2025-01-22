import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { UserRole } from '../types'

export async function verifyUserRole(userId: string): Promise<UserRole> {
  const supabase = createRouteHandlerClient({ cookies })
  
  // Get role from users_secure table (server-side only)
  const { data: userData, error } = await supabase
    .from('users_secure')
    .select('role')
    .eq('id', userId)
    .single()
    
  if (error || !userData) {
    console.error('Role verification error:', error)
    return UserRole.USER // Default to lowest privilege
  }
  
  return userData.role as UserRole
}

export async function hasRequiredRole(
  userId: string, 
  requiredRole: UserRole | UserRole[]
): Promise<boolean> {
  const userRole = await verifyUserRole(userId)
  
  // Admin always has access
  if (userRole === UserRole.ADMIN) return true
  
  // Check against required roles
  const allowedRoles = Array.isArray(requiredRole) ? requiredRole : [requiredRole]
  return allowedRoles.includes(userRole)
} 