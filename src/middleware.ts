import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// List of public routes that don't require authentication
const PUBLIC_ROUTES = [
  '/auth/callback',
  '/auth/signup',
  '/auth/login',
  '/'
]

export async function middleware(req: NextRequest) {
  console.log('🛡️ [Middleware] Executing for path:', req.nextUrl.pathname, 'at:', new Date().toISOString())
  let response = NextResponse.next()
  
  console.log('🛡️ [Middleware] Creating Supabase client')
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: CookieOptions) {
          response.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

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
  if (PUBLIC_ROUTES.includes(req.nextUrl.pathname)) {
    console.log('🛡️ [Middleware] Allowing public route to proceed:', req.nextUrl.pathname)
    return response
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
  return response
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