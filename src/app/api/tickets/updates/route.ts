import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { UserRole } from '@/lib/types'
import { handleError } from '@/lib/utils/error-handling'
import { protectApiRoute } from '@/lib/auth/protect-api'
import type { NextRequest } from 'next/server'

export async function GET(req: NextRequest) {
  return protectApiRoute(req, async () => {
    try {
      const supabase = createRouteHandlerClient({ cookies })
      
      // Get current user and role
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }

      const { data: userData, error: roleError } = await supabase
        .from('users_secure')
        .select('role')
        .eq('id', session.user.id)
        .single()

      if (roleError || !userData) {
        return NextResponse.json({ error: 'Failed to verify user role' }, { status: 403 })
      }

      const isStaff = [UserRole.ADMIN, UserRole.AGENT].includes(userData.role as UserRole)

      // Build query based on user role
      let query = supabase
        .from('ticket_activities')
        .select(`
          *,
          actor:users_secure(email),
          ticket:tickets(title)
        `)
        .order('created_at', { ascending: false })

      // Apply role-based filters
      if (!isStaff) {
        // Regular users only see updates for their tickets
        query = query.eq('tickets.created_by', session.user.id)
      }

      const { data: activities, error } = await query

      if (error) {
        return NextResponse.json(handleError(error, 'fetch_ticket_updates'))
      }

      // Filter activities based on user role
      const filteredActivities = activities?.filter(activity => 
        isStaff || activity.activity_type === 'comment'
      ) || []

      return NextResponse.json({ activities: filteredActivities })
    } catch (err) {
      return NextResponse.json(
        handleError(err, 'fetch_ticket_updates'),
        { status: 500 }
      )
    }
  })
} 