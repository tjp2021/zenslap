import { NextResponse } from 'next/server'
import { withAuth } from './withAuth'
import { UserRole } from '@/lib/types'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import type { Database } from '@/types/supabase'

async function verifyRole(userId: string): Promise<UserRole> {
  const cookieStore = cookies()
  const supabase = createRouteHandlerClient<Database>({ 
    cookies: () => cookieStore 
  })
  
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

export function withRole(requiredRole: UserRole | UserRole[]) {
  return (handler: Parameters<typeof withAuth>[0]) => {
    return withAuth(async (req, context, session) => {
      const userRole = await verifyRole(session.user.id)
      
      // Admin always has access
      if (userRole === UserRole.ADMIN) {
        return handler(req, context, session)
      }
      
      // Check against required roles
      const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole]
      if (!roles.includes(userRole)) {
        return NextResponse.json(
          { error: 'Insufficient permissions' },
          { status: 403 }
        )
      }
      
      return handler(req, context, session)
    })
  }
} 