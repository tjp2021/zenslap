import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')

  if (!code) {
    return NextResponse.redirect(new URL('/auth/login', requestUrl.origin))
  }

  const cookieStore = cookies()
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

  try {
    await supabase.auth.exchangeCodeForSession(code)
    return NextResponse.redirect(new URL('/tickets', requestUrl.origin))
  } catch (error) {
    console.error('Auth error:', error)
    return NextResponse.redirect(new URL('/auth/login', requestUrl.origin))
  }
} 