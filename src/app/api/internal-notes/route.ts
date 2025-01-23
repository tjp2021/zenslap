import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { createInternalNoteSchema } from '@/lib/validation'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const ticketId = searchParams.get('ticketId')
    
    if (!ticketId) {
      return NextResponse.json({ error: 'Ticket ID is required' }, { status: 400 })
    }

    const supabase = createRouteHandlerClient({ cookies })
    const { data, error } = await supabase
      .from('internal_notes')
      .select('*')
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: true })

    if (error) throw error
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching notes:', error)
    return NextResponse.json(
      { error: 'Failed to fetch notes' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const json = await request.json()
    console.log('📥 [API] Received create note request:', json)
    
    const validated = createInternalNoteSchema.parse(json)
    console.log('✅ [API] Validation passed:', validated)
    
    const supabase = createRouteHandlerClient({ cookies })
    
    // Get current user
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      console.log('❌ [API] No session found')
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    console.log('👤 [API] User authenticated:', session.user.id)

    const { data, error } = await supabase
      .from('internal_notes')
      .insert([{
        ...validated,
        created_by: session.user.id
      }])
      .select()
      .single()

    if (error) {
      console.error('❌ [API] Database error:', error)
      throw error
    }
    
    console.log('✅ [API] Note created:', data)
    return NextResponse.json(data)
  } catch (error) {
    console.error('❌ [API] Error creating note:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create note' },
      { status: 500 }
    )
  }
} 