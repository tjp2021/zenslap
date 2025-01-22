'use client'

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '@/types/supabase'

// For use in client components only
export function createClient() {
  return createClientComponentClient<Database>()
} 