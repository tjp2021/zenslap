import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    console.log('🎯 [Callback] Route hit at:', new Date().toISOString())
    const requestUrl = new URL(request.url)
    console.log('🎯 [Callback] Full URL:', requestUrl.toString())
    
    // Get all URL parameters for debugging
    const allParams = Object.fromEntries(requestUrl.searchParams.entries())
    console.log('🎯 [Callback] All URL parameters:', allParams)
    
    // Get the code and error from the URL
    const code = requestUrl.searchParams.get('code')
    const error = requestUrl.searchParams.get('error')
    const error_description = requestUrl.searchParams.get('error_description')
    
    console.log('🎯 [Callback] Auth params:', { 
      code: code ? 'present' : 'missing',
      codeLength: code?.length,
      error,
      error_description
    })

    // If there's an error, redirect to login
    if (error) {
      console.error('🎯 [Callback] Auth error:', { error, error_description })
      return NextResponse.redirect(new URL('/auth/login', requestUrl.origin))
    }

    // If there's no code, redirect to login
    if (!code) {
      console.warn('🎯 [Callback] No code present in callback')
      return NextResponse.redirect(new URL('/auth/login', requestUrl.origin))
    }

    // Create a Supabase client for the Route Handler
    console.log('🎯 [Callback] Creating Supabase client')
    const supabase = createRouteHandlerClient({ cookies })
    
    // Exchange the code for a session
    console.log('🎯 [Callback] Attempting to exchange code for session')
    const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
    
    if (exchangeError) {
      console.error('🎯 [Callback] Session exchange error:', exchangeError)
      throw exchangeError
    }

    console.log('🎯 [Callback] Session exchange complete:', { 
      hasSession: !!data.session,
      userId: data.session?.user?.id,
      timestamp: new Date().toISOString()
    })

    // Create response to redirect to /tickets
    console.log('🎯 [Callback] Creating redirect response to /tickets')
    const response = NextResponse.redirect(new URL('/tickets', requestUrl.origin))
    
    console.log('🎯 [Callback] Returning redirect response')
    return response

  } catch (err) {
    console.error('🎯 [Callback] Error in callback route:', err)
    return NextResponse.redirect(new URL('/auth/login', requestUrl.origin))
  }
} 