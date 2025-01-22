import { createServerSupabaseClient } from '@/app/auth'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function protectApiRoute(
  req: NextRequest,
  handler: (req: NextRequest) => Promise<NextResponse>
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
    
    return handler(req)
  } catch (error) {
    console.error('API protection error:', error)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    )
  }
} 