import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  
  console.log('🎯 Auth Callback - Start', { 
    url: requestUrl.toString(),
    hasCode: !!code,
    timestamp: new Date().toISOString()
  })

  if (!code) {
    console.log('⚠️ Auth Callback - No code, redirecting to login')
    return NextResponse.redirect(new URL('/auth/login', requestUrl.origin))
  }

  const cookieStore = cookies()
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

  try {
    // First check if we already have a session
    const { data: { session: existingSession } } = await supabase.auth.getSession()
    console.log('🔍 Auth Callback - Existing Session Check', {
      hasExistingSession: !!existingSession,
      existingUserId: existingSession?.user?.id,
      existingEmail: existingSession?.user?.email
    })

    console.log('🔄 Auth Callback - Exchanging code for session')
    const { data: { session }, error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (error) {
      console.error('❌ Auth Callback - Exchange error:', {
        error: error.message,
        code: error.status,
        name: error.name
      })
      throw error
    }

    if (!session) {
      console.error('❌ Auth Callback - No session after exchange')
      throw new Error('No session')
    }

    console.log('✅ Auth Callback - Exchange successful', {
      userId: session.user.id,
      email: session.user.email,
      metadata: session.user.user_metadata,
      hasAccessToken: !!session.access_token,
      hasRefreshToken: !!session.refresh_token
    })

    // Fetch user role from database
    const { data: userData, error: roleError } = await supabase
      .from('users_secure')
      .select('role')
      .eq('id', session.user.id)
      .single()

    if (roleError) {
      console.error('❌ Auth Callback - Role fetch error:', roleError)
      throw roleError
    }

    // Set role in user metadata
    const { error: updateError } = await supabase.auth.updateUser({
      data: { db_role: userData.role }
    })

    if (updateError) {
      console.error('❌ Auth Callback - Role metadata update error:', updateError)
      throw updateError
    }

    console.log('✅ Auth Callback - Role set:', {
      role: userData.role,
      userId: session.user.id
    })

    // Verify session was properly set
    const { data: { session: verifySession }, error: verifyError } = await supabase.auth.getSession()
    
    if (verifyError || !verifySession) {
      console.error('❌ Auth Callback - Session verification failed', {
        error: verifyError?.message,
        hasSession: !!verifySession
      })
      throw new Error('Session verification failed')
    }

    console.log('✅ Auth Callback - Session verified', {
      verifiedUserId: verifySession.user.id,
      verifiedEmail: verifySession.user.email,
      hasAccessToken: !!verifySession.access_token,
      hasRefreshToken: !!verifySession.refresh_token
    })

    // Create response with redirect to /tickets on successful login
    const response = NextResponse.redirect(new URL('/tickets', SITE_URL))
    
    // Add cache control headers to prevent caching
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
    response.headers.set('Pragma', 'no-cache')
    response.headers.set('Expires', '0')
    
    console.log('↪️ Auth Callback - Redirecting to /tickets', {
      siteUrl: SITE_URL,
      target: '/tickets',
      timestamp: new Date().toISOString()
    })
    
    return response
  } catch (error) {
    console.error('💥 Auth Callback - Fatal Error:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    })
    // Use original request URL for error redirect to break potential loops
    return NextResponse.redirect(new URL('/auth/login', requestUrl.origin))
  }
} 