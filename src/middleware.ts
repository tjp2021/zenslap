import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '@/lib/supabase/server'
import { UserRole } from '@/lib/types'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

// Define route patterns
const ADMIN_ROUTES = ['/admin']
const AGENT_ROUTES = ['/tickets', '/tickets/*']  // Remove dashboard group since we're not using it
const AUTHENTICATED_ROUTES = ['/*']  // All routes require auth except public ones
const PUBLIC_ROUTES = ['/', '/about', '/contact', '/unauthorized', '/auth/login', '/auth/signup', '/auth/forgot-password']
const AUTH_ROUTES = ['/auth/login', '/auth/signup', '/auth/forgot-password']

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const pathname = req.nextUrl.pathname
  
  console.log('🔍 Middleware - Start', { 
    pathname,
    url: req.url,
    method: req.method,
    siteUrl: SITE_URL
  })

  // Skip middleware for auth callback first
  if (pathname.startsWith('/auth/callback')) {
    console.log('🎯 Middleware - Auth Callback Detected', { 
      pathname,
      hasCode: req.nextUrl.searchParams.has('code'),
      code: req.nextUrl.searchParams.get('code')?.substring(0, 8) + '...'
    })
    return res
  }

  // Check if it's an exact match for public routes
  if (PUBLIC_ROUTES.includes(pathname)) {
    console.log('📢 Middleware - Public Route Access', { pathname })
    return res
  }

  // Create Supabase client
  const supabase = createMiddlewareClient<Database>({ req, res })

  // Check session
  const { data: { session }, error } = await supabase.auth.getSession()
  console.log('🔑 Middleware - Session Check', {
    hasSession: !!session,
    userId: session?.user?.id,
    email: session?.user?.email
  })

  if (error || !session) {
    console.log('⛔ Middleware - No session, redirecting to login', { pathname })
    return NextResponse.redirect(new URL('/auth/login', SITE_URL))
  }

  // Get user role
  const { data: userData, error: roleError } = await supabase
    .from('users_secure')
    .select('role')
    .eq('id', session.user.id)
    .single()

  const userRole = userData?.role || UserRole.USER
  console.log('👤 Middleware - Role Check', { pathname, userRole })

  // Check admin routes
  if (ADMIN_ROUTES.some(route => pathname.startsWith(route))) {
    if (userRole !== UserRole.ADMIN) {
      console.log('🚫 Middleware - Unauthorized admin access', { pathname, userRole })
      return NextResponse.redirect(new URL('/unauthorized', SITE_URL))
    }
  }

  // Check agent routes
  if (AGENT_ROUTES.some(route => pathname.startsWith(route))) {
    if (userRole !== UserRole.ADMIN && userRole !== UserRole.AGENT) {
      console.log('🚫 Middleware - Unauthorized agent access', { pathname, userRole })
      return NextResponse.redirect(new URL('/unauthorized', SITE_URL))
    }
  }

  console.log('✅ Middleware - Access granted', { pathname, userRole })
  return res
}

export const config = {
  matcher: [
    // Protected routes
    '/(dashboard)/:path*',
    '/admin/:path*',
    '/tickets/:path*',
    
    // Exclude static files and api routes
    '/((?!_next/static|_next/image|favicon.ico|public|api).*)'
  ]
}