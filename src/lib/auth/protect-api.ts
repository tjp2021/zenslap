import { createServerSupabaseClient } from '@/app/auth'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { UserRole } from '../types'
import { hasRequiredRole } from './verify-role'

type RoleRequirement = UserRole | UserRole[] | undefined

export async function protectApiRoute(
  req: NextRequest,
  handler: (req: NextRequest) => Promise<NextResponse>,
  requiredRole?: RoleRequirement
) {
  const supabase = createServerSupabaseClient()
  
  try {
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // If role requirement specified, verify server-side
    if (requiredRole) {
      const hasPermission = await hasRequiredRole(session.user.id, requiredRole)
      
      if (!hasPermission) {
        return NextResponse.json(
          { error: 'Insufficient permissions' },
          { status: 403 }
        )
      }
    }
    
    return handler(req)
  } catch (error) {
    console.error('API protection error:', error)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    )
  }
} 