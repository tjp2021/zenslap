import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// List of public routes that don't require authentication
const PUBLIC_ROUTES = [
  '/login',
  '/auth/callback',
  '/auth/signup',
  '/auth/login',
  '/'
]

export async function middleware(request: NextRequest) {
  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value
          },
          set(name: string, value: string, options: Record<string, unknown>) {
            NextResponse.next().cookies.set({
              name,
              value,
              ...options,
            })
          },
          remove(name: string, options: Record<string, unknown>) {
            NextResponse.next().cookies.set({
              name,
              value: '',
              ...options,
            })
          },
        },
      }
    )
    const {
      data: { session },
    } = await supabase.auth.getSession()

    // Auth condition already satisfied
    if (session) {
      return NextResponse.next()
    }

    // Check if the request is for a public route
    const isPublicRoute = PUBLIC_ROUTES.some(pattern => 
      new RegExp(`^${pattern.replace('*', '.*')}$`).test(request.nextUrl.pathname)
    )

    if (isPublicRoute) {
      return NextResponse.next()
    }

    // Redirect to login if no session
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = '/login'
    redirectUrl.searchParams.set('redirectedFrom', request.nextUrl.pathname)
    return NextResponse.redirect(redirectUrl)

  } catch {
    // Handle errors
    return NextResponse.redirect(new URL('/login', request.nextUrl))
  }
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)']
} 