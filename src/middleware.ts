import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { UserRole } from './lib/types'
import { verifyUserRole } from './lib/auth/verify-role'

// Define route patterns
const ADMIN_ROUTES = ['/admin', '/settings']
const AGENT_ROUTES = ['/queue', '/reports']
const AUTHENTICATED_ROUTES = ['/tickets', '/profile']
const PUBLIC_ROUTES = ['/', '/about', '/contact'] // Add any other public routes here

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })
  const pathname = req.nextUrl.pathname

  // Allow public routes
  if (PUBLIC_ROUTES.some(route => pathname === route)) {
    return res
  }

  const {
    data: { session },
  } = await supabase.auth.getSession()

  // Auth routes - redirect to /tickets if already logged in
  if (pathname.startsWith('/auth')) {
    if (session) {
      const redirectUrl = new URL('/tickets', req.url)
      return NextResponse.redirect(redirectUrl)
    }
    return res
  }

  // Protected routes - redirect to /auth/login if not logged in
  if (!session && !pathname.startsWith('/auth')) {
    const redirectUrl = new URL('/auth/login', req.url)
    return NextResponse.redirect(redirectUrl)
  }

  // For authenticated routes, we only need to verify session exists
  if (AUTHENTICATED_ROUTES.some(route => pathname.startsWith(route))) {
    if (!session) {
      return NextResponse.redirect(new URL('/auth/login', req.url))
    }
    return res
  }

  // Only verify roles for admin/agent routes if we have a session
  if (session) {
    const userRole = await verifyUserRole(session.user.id)

    // Admin routes protection
    if (ADMIN_ROUTES.some(route => pathname.startsWith(route))) {
      if (userRole !== UserRole.ADMIN) {
        return NextResponse.redirect(new URL('/unauthorized', req.url))
      }
    }

    // Agent routes protection
    if (AGENT_ROUTES.some(route => pathname.startsWith(route))) {
      if (userRole !== UserRole.ADMIN && userRole !== UserRole.AGENT) {
        return NextResponse.redirect(new URL('/unauthorized', req.url))
      }
    }
  }

  return res
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
    '/(api|trpc)(.*)'
  ]
}