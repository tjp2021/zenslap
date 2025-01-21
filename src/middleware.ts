import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// List of public routes that don't require authentication
const PUBLIC_ROUTES = [
  '/auth/callback',
  '/auth/signup',
  '/auth/login',
  '/'
]

export async function middleware(request: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req: request, res })
  const { data: { session } } = await supabase.auth.getSession()

  // If user is not signed in and the current path is not /auth/*, redirect to /auth/login
  if (!session && !request.nextUrl.pathname.startsWith('/auth/')) {
    return NextResponse.redirect(new URL('/auth/login', request.url))
  }

  // If user is signed in and the current path is /auth/*, redirect to /tickets
  if (session && request.nextUrl.pathname.startsWith('/auth/')) {
    return NextResponse.redirect(new URL('/tickets', request.url))
  }

  return res
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)']
} 