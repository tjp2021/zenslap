'use server'

import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import type { Database } from '@/types/supabase'

// For use in Server Components
export function createContextAwareClient() {
  return createServerComponentClient<Database>({ cookies })
} 