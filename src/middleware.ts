import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { UserRole } from './lib/types'
import { verifyUserRole } from './lib/auth/verify-role'

// Define route patterns
const ADMIN_ROUTES = ['/admin', '/settings']
const AGENT_ROUTES = ['/queue', '/reports']
const AUTHENTICATED_ROUTES = ['/tickets', '/profile']
const PUBLIC_ROUTES = ['/', '/about', '/contact', '/unauthorized'] // Add any other public routes here
const AUTH_ROUTES = ['/auth/login', '/auth/signup', '/auth/forgot-password']

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })
  const pathname = req.nextUrl.pathname
  
  console.log('🔍 Middleware - Start', { 
    pathname,
    url: req.url,
    method: req.method
  })

  // Check session status
  const {
    data: { session },
  } = await supabase.auth.getSession()
  
  console.log('🔑 Middleware - Session Check', { 
    hasSession: !!session,
    userId: session?.user?.id,
    email: session?.user?.email
  })

  // 1. Allow public routes without any checks
  if (PUBLIC_ROUTES.some(route => pathname === route)) {
    console.log('📢 Middleware - Public Route Access', { pathname })
    return res
  }

  // 2. Special handling for auth callback
  if (pathname === '/auth/callback') {
    console.log('🎯 Middleware - Auth Callback Detected', { 
      pathname,
      hasCode: req.nextUrl.searchParams.has('code'),
      code: req.nextUrl.searchParams.get('code')?.substring(0, 8) + '...' // Log first 8 chars for debugging
    })
    return res
  }

  // 3. Handle other auth routes (login, signup, etc.)
  if (AUTH_ROUTES.includes(pathname)) {
    console.log('🔒 Middleware - Auth Route', { pathname, hasSession: !!session })
    // If logged in, redirect to tickets
    if (session) {
      console.log('↪️ Middleware - Redirecting authenticated user from auth route to /tickets')
      return NextResponse.redirect(new URL('/tickets', req.url))
    }
    return res
  }

  // 4. All other routes require authentication
  if (!session) {
    console.log('⛔ Middleware - No Session, Redirecting to login', { pathname })
    return NextResponse.redirect(new URL('/auth/login', req.url))
  }

  // 5. Role-based route protection
  const userRole = await verifyUserRole(session.user.id, req, res)
  console.log('👤 Middleware - Role Check', { pathname, userRole })

  // Admin routes protection
  if (ADMIN_ROUTES.some(route => pathname.startsWith(route))) {
    if (userRole !== UserRole.ADMIN) {
      console.log('🚫 Middleware - Unauthorized Admin Route Access', { pathname, userRole })
      return NextResponse.redirect(new URL('/unauthorized', req.url))
    }
  }

  // Agent routes protection
  if (AGENT_ROUTES.some(route => pathname.startsWith(route))) {
    if (userRole !== UserRole.ADMIN && userRole !== UserRole.AGENT) {
      console.log('🚫 Middleware - Unauthorized Agent Route Access', { pathname, userRole })
      return NextResponse.redirect(new URL('/unauthorized', req.url))
    }
  }

  console.log('✅ Middleware - Access Granted', { pathname, userRole })
  return res
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
    '/(api|trpc)(.*)'
  ]
}