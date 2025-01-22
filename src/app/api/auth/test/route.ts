import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/api/middleware/withAuth'

export const GET = withAuth(async (req, context, session) => {
  return NextResponse.json({
    message: 'Auth working',
    user: {
      id: session.user.id,
      email: session.user.email,
    }
  })
}) 