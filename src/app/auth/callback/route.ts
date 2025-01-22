import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')

  if (!code) {
    return NextResponse.redirect(new URL('/auth/login', requestUrl.origin), { status: 303 })
  }

  const supabase = createRouteHandlerClient({ cookies })

  try {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) throw error
    return NextResponse.redirect(new URL('/tickets', requestUrl.origin), { status: 303 })
  } catch (error) {
    console.error('Auth error:', error)
    return NextResponse.redirect(new URL('/auth/login', requestUrl.origin), { status: 303 })
  }
} 