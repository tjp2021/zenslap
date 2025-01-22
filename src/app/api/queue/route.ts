import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import type { Database } from '@/types/supabase'

type QueueStatus = 'pending' | 'processing' | 'completed' | 'failed'

export async function POST(request: Request) {
  try {
    const supabase = createRouteHandlerClient<Database>({ cookies })
    const { type, payload } = await request.json()
    
    const { data, error } = await supabase
      .from('queue')
      .insert([{ type, payload, status: 'pending' }])
      .select()
      .single()

    if (error) throw error
    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to add to queue' }, { status: 500 })
  }
}

export async function GET() {
  try {
    const supabase = createRouteHandlerClient<Database>({ cookies })
    const { data, error } = await supabase
      .from('queue')
      .select()
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(1)
      .single()

    if (error && error.code !== 'PGRST116') throw error
    return NextResponse.json(data || null)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to get queue item' }, { status: 500 })
  }
} 