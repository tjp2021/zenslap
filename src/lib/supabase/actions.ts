'use server'

import { createServerActionClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import type { Database } from '@/types/supabase'

// For use in server actions only
export function createActionClient() {
  return createServerActionClient<Database>({ cookies })
} 