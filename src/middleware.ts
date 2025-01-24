import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '@/lib/supabase/server'
import { UserRole } from '@/lib/types'

// Define route patterns
const ADMIN_ROUTES = ['/admin']
const AGENT_ROUTES = ['/(dashboard)/tickets', '/(dashboard)/tickets/*']  // Updated to match Next.js 13+ route groups
const AUTHENTICATED_ROUTES = ['/(dashboard)/*']  // All dashboard routes require auth
const PUBLIC_ROUTES = ['/', '/about', '/contact', '/unauthorized', '/auth/login', '/auth/signup', '/auth/forgot-password']
const AUTH_ROUTES = ['/auth/login', '/auth/signup', '/auth/forgot-password']

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const pathname = req.nextUrl.pathname
  
  console.log('🔍 Middleware - Start', { 
    pathname,
    url: req.url,
    method: req.method
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
    return NextResponse.redirect(new URL('/auth/login', req.url))
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
      return NextResponse.redirect(new URL('/unauthorized', req.url))
    }
  }

  // Check agent routes
  if (AGENT_ROUTES.some(route => pathname.startsWith(route))) {
    if (userRole !== UserRole.ADMIN && userRole !== UserRole.AGENT) {
      console.log('🚫 Middleware - Unauthorized agent access', { pathname, userRole })
      return NextResponse.redirect(new URL('/unauthorized', req.url))
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