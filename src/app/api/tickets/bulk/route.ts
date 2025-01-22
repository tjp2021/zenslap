import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import type { Database } from '@/types/supabase'

export async function PATCH(request: Request) {
  try {
    const supabase = createRouteHandlerClient<Database>({ cookies })
    const { ids, updates } = await request.json()
    
    const { data, error } = await supabase
      .from('tickets')
      .update(updates)
      .in('id', ids)
      .select()
      
    if (error) throw error
    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to bulk update tickets' }, { status: 500 })
  }
} 