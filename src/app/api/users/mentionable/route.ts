import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { UserRole } from '@/lib/types'

export async function GET() {
    try {
        const cookieStore = cookies()
        const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

        // Get current user's role
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            )
        }

        // Get user's role from users_secure table
        const { data: currentUser, error: roleError } = await supabase
            .from('users_secure')
            .select('role')
            .eq('id', session.user.id)
            .single()

        if (roleError || !currentUser) {
            return NextResponse.json(
                { error: 'Failed to verify user role' },
                { status: 403 }
            )
        }

        // Only allow admin and agents to fetch mentionable users
        if (currentUser.role !== UserRole.ADMIN && currentUser.role !== UserRole.AGENT) {
            return NextResponse.json(
                { error: 'Insufficient permissions' },
                { status: 403 }
            )
        }

        // Fetch all admin and agent users
        const { data: users, error } = await supabase
            .from('users_secure')
            .select('id, email, role')
            .in('role', [UserRole.ADMIN, UserRole.AGENT])
            .order('email')

        if (error) {
            throw error
        }

        return NextResponse.json(users)
    } catch (error) {
        console.error('Error fetching mentionable users:', error)
        return NextResponse.json(
            { error: 'Failed to fetch mentionable users' },
            { status: 500 }
        )
    }
} 