import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '@/types/supabase'
import type { RequestCookies } from '@edge-runtime/cookies'

// For use in API routes and server components only
export function createServerClient(cookieStore?: RequestCookies) {
  return createRouteHandlerClient<Database>({ 
    cookies: () => cookieStore as any
  })
}

// Re-export Database type for convenience
export type { Database } 