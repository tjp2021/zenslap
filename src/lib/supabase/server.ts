import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '@/types/supabase'
import { cookies } from 'next/headers'

// For use in API routes and server components only
export function createServerClient() {
  const cookieStore = cookies()
  return createRouteHandlerClient<Database>({ cookies: () => cookieStore })
}

// Re-export Database type for convenience
export type { Database } 