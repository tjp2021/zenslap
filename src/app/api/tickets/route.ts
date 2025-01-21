import { NextRequest, NextResponse } from 'next/server'
import { ticketService } from '@/lib/api/routes/tickets'
import { createTicketSchema } from '@/lib/validation/tickets'
import { ZodError } from 'zod'

// GET /api/tickets - List all tickets
export async function GET() {
  try {
    const { data, error } = await ticketService.getAll()
    
    if (error) {
      return NextResponse.json(
        { error: error.message || 'Failed to fetch tickets' },
        { status: 500 }
      )
    }
    
    return NextResponse.json({ data })
  } catch {
    return NextResponse.json(
      { error: 'Failed to fetch tickets' },
      { status: 500 }
    )
  }
}

// POST /api/tickets - Create a new ticket
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log('Received ticket data:', body)
    
    const validatedData = createTicketSchema.parse(body)
    console.log('Validated data:', validatedData)
    
    const { data, error } = await ticketService.create(validatedData)
    console.log('Service response:', { data, error })

    if (error) {
      console.error('Service error:', error)
      return NextResponse.json(
        { error: error.message || 'Failed to create ticket' },
        { status: 400 }
      )
    }

    return NextResponse.json({ data }, { status: 201 })
  } catch (err) {
    console.error('API error:', err)
    if (err instanceof ZodError) {
      return NextResponse.json(
        { error: err.errors[0].message },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'Failed to create ticket' },
      { status: 500 }
    )
  }
} 