import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '@/types/supabase'
import type { NextRequest, NextResponse } from 'next/server'

// For use in middleware only
export function createMiddlewareSupabase(req: NextRequest, res: NextResponse) {
  return createMiddlewareClient<Database>({ req, res })
} 