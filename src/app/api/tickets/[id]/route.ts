import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { updateTicketSchema } from '@/lib/validation/tickets'
import { ACTIVITY_TYPES } from '@/lib/types/activities'
import { UserRole } from '@/lib/types'

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user role
    const { data: userData, error: userError } = await supabase
      .from('users_secure')
      .select('role')
      .eq('id', user.id)
      .single()

    if (userError || !userData) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userRole = userData.role as UserRole

    // Only agents and admins can update tickets
    if (![UserRole.ADMIN, UserRole.AGENT].includes(userRole)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get current ticket state
    const { data: currentTicket, error: fetchError } = await supabase
      .from('tickets')
      .select('*')
      .eq('id', params.id)
      .single()

    if (fetchError || !currentTicket) {
      return NextResponse.json(
        { error: 'Ticket not found' },
        { status: 404 }
      )
    }

    // Parse and validate update data
    const updates = await request.json()
    const validatedData = updateTicketSchema.parse(updates)

    // Permission checks for specific fields
    if (userRole === UserRole.AGENT) {
      // Agents can only assign tickets to themselves or unassign themselves
      if ('assignee' in validatedData) {
        const isAssigningToSelf = validatedData.assignee === user.id
        const isUnassigningSelf = validatedData.assignee === null && currentTicket.assignee === user.id
        
        if (!isAssigningToSelf && !isUnassigningSelf) {
          return NextResponse.json(
            { error: 'Agents can only assign tickets to themselves' },
            { status: 403 }
          )
        }
      }
    }

    // Track changes before update
    const changes = []
    
    // Check status change
    if (validatedData.status && validatedData.status !== currentTicket.status) {
      changes.push({
        ticket_id: params.id,
        actor_id: user.id,
        activity_type: ACTIVITY_TYPES.STATUS_CHANGE,
        content: {
          from: currentTicket.status,
          to: validatedData.status
        }
      })
    }

    // Check priority change
    if (validatedData.priority && validatedData.priority !== currentTicket.priority) {
      changes.push({
        ticket_id: params.id,
        actor_id: user.id,
        activity_type: ACTIVITY_TYPES.FIELD_CHANGE,
        content: {
          field: 'priority',
          from: currentTicket.priority,
          to: validatedData.priority
        }
      })
    }

    // Check assignee change
    if ('assignee' in validatedData && validatedData.assignee !== currentTicket.assignee) {
      changes.push({
        ticket_id: params.id,
        actor_id: user.id,
        activity_type: ACTIVITY_TYPES.ASSIGNMENT,
        content: {
          from: currentTicket.assignee,
          to: validatedData.assignee
        }
      })
    }

    // Update ticket
    const { data: updatedTicket, error: updateError } = await supabase
      .from('tickets')
      .update(validatedData)
      .eq('id', params.id)
      .select()
      .single()

    if (updateError) {
      throw updateError
    }

    // Record all activities
    if (changes.length > 0) {
      const { error: activityError } = await supabase
        .from('ticket_activities')
        .insert(changes)

      if (activityError) {
        console.error('Failed to record activities:', activityError)
      }
    }

    return NextResponse.json({ data: updatedTicket })
  } catch (error) {
    console.error('Error updating ticket:', error)
    return NextResponse.json(
      { error: 'Failed to update ticket' },
      { status: 500 }
    )
  }
} 