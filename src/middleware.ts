import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  console.log('🛡️ [Middleware] Executing for path:', req.nextUrl.pathname, 'at:', new Date().toISOString())
  const res = NextResponse.next()
  
  console.log('🛡️ [Middleware] Creating Supabase client')
  const supabase = createMiddlewareClient({ req, res })

  console.log('🛡️ [Middleware] Getting session')
  const {
    data: { session },
  } = await supabase.auth.getSession()
  
  console.log('🛡️ [Middleware] Session status:', { 
    hasSession: !!session, 
    userId: session?.user?.id,
    path: req.nextUrl.pathname,
    timestamp: new Date().toISOString()
  })

  // Skip auth check for public routes
  if (req.nextUrl.pathname === '/auth/callback' || req.nextUrl.pathname === '/') {
    console.log('🛡️ [Middleware] Allowing public route to proceed:', req.nextUrl.pathname)
    return res
  }

  // If user is not signed in and trying to access protected routes,
  // redirect the user to /auth/login
  if (!session && (req.nextUrl.pathname.startsWith('/(dashboard)') || req.nextUrl.pathname.startsWith('/tickets'))) {
    console.log('🛡️ [Middleware] No session, redirecting to login from:', req.nextUrl.pathname)
    const redirectUrl = req.nextUrl.clone()
    redirectUrl.pathname = '/auth/login'
    redirectUrl.searchParams.set(`redirectedFrom`, req.nextUrl.pathname)
    return NextResponse.redirect(redirectUrl)
  }

  // If user is signed in and the current path is /auth/login,
  // redirect the user to /tickets
  if (session && req.nextUrl.pathname === '/auth/login') {
    console.log('🛡️ [Middleware] User signed in at login page, redirecting to tickets')
    const redirectUrl = req.nextUrl.clone()
    redirectUrl.pathname = '/tickets'
    return NextResponse.redirect(redirectUrl)
  }

  console.log('🛡️ [Middleware] Proceeding with request for path:', req.nextUrl.pathname)
  return res
}

export const config = {
  matcher: [
    // Protect dashboard routes
    '/(dashboard)/:path*',
    // Protect tickets routes
    '/tickets/:path*',
    // Protect API routes
    '/api/:path*',
    // Handle auth routes
    '/auth/:path*'
  ]
} 