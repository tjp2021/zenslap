import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import type { Database } from '@/types/supabase'

// For use in API routes only
export async function createServerClient() {
  const cookieStore = await cookies()
  return createRouteHandlerClient<Database>({ 
    cookies: async () => cookieStore 
  })
} 