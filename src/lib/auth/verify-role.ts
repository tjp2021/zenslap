import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { UserRole } from '../types'
import type { NextRequest, NextResponse } from 'next/server'
import type { Database } from '@/types/supabase'

export async function verifyUserRole(
  userId: string,
  req?: NextRequest,
  res?: NextResponse
): Promise<UserRole> {
  let supabase;
  
  // If req and res are provided, we're in middleware context
  if (req && res) {
    console.log('🔍 verifyUserRole - Using middleware client')
    supabase = createMiddlewareClient<Database>({ req, res })
  } else {
    // We're in a route handler context
    console.log('🔍 verifyUserRole - Using route handler client')
    const cookieStore = await cookies()
    supabase = createRouteHandlerClient<Database>({ 
      cookies: async () => cookieStore 
    })
  }
  
  // Get role from users_secure table (server-side only)
  console.log('🔍 verifyUserRole - Querying role for user:', userId)
  const { data: userData, error } = await supabase
    .from('users_secure')
    .select('role')
    .eq('id', userId)
    .single()
    
  if (error) {
    console.error('❌ verifyUserRole - Database error:', error)
    return UserRole.USER // Default to lowest privilege
  }
  
  if (!userData) {
    console.error('❌ verifyUserRole - No user data found for ID:', userId)
    return UserRole.USER // Default to lowest privilege
  }
  
  console.log('✅ verifyUserRole - Found role:', userData.role)
  return userData.role as UserRole
}

export async function hasRequiredRole(
  userId: string, 
  requiredRole: UserRole | UserRole[],
  req?: NextRequest,
  res?: NextResponse
): Promise<boolean> {
  const userRole = await verifyUserRole(userId, req, res)
  
  // Admin always has access
  if (userRole === UserRole.ADMIN) return true
  
  // Check against required roles
  const allowedRoles = Array.isArray(requiredRole) ? requiredRole : [requiredRole]
  return allowedRoles.includes(userRole)
} 