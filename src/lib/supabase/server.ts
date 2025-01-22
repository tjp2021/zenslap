import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import type { Database } from '@/types/supabase'

// For use in API route handlers
export function createApiClient() {
  return createRouteHandlerClient<Database>({ cookies })
}

// For use in Server Components
export function createServerClient() {
  return createServerComponentClient<Database>({ cookies })
}

// For repositories that need to work in both contexts
export async function createContextAwareClient() {
  'use server'
  return createServerComponentClient<Database>({ cookies })
} 