import { NextRequest, NextResponse } from 'next/server'
import { ticketService } from '@/lib/api/routes/tickets'
import { updateTicketSchema } from '@/lib/validation/tickets'
import { ZodError } from 'zod'

interface RouteContext {
  params: {
    id: string
  }
}

// GET /api/tickets/[id] - Get a specific ticket
export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = context.params
    const { data, error } = await ticketService.getById(id)
    
    if (error) {
      return NextResponse.json(
        { error },
        { status: 404 }
      )
    }

    return NextResponse.json({ data })
  } catch {
    return NextResponse.json(
      { error: 'Failed to fetch ticket' },
      { status: 500 }
    )
  }
}

// PUT /api/tickets/[id] - Update a ticket
export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const { id } = context.params
    const body = await request.json()
    
    const validatedData = updateTicketSchema.parse({ ...body, id })
    const { data, error } = await ticketService.update(id, validatedData)

    if (error) {
      return NextResponse.json(
        { error },
        { status: 400 }
      )
    }

    return NextResponse.json({ data })
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json(
        { error: err.errors[0].message },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'Failed to update ticket' },
      { status: 500 }
    )
  }
}

// DELETE /api/tickets/[id] - Delete a ticket
export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = context.params
    const { error } = await ticketService.delete(id)
    
    if (error) {
      return NextResponse.json(
        { error },
        { status: 400 }
      )
    }

    return new NextResponse(null, { status: 204 })
  } catch {
    return NextResponse.json(
      { error: 'Failed to delete ticket' },
      { status: 500 }
    )
  }
} 