import { NextResponse } from 'next/server'
import { ticketService } from '@/lib/api/routes/tickets'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const id = params.id
  if (!id) {
    return NextResponse.json({ error: 'Ticket ID is required' }, { status: 400 })
  }

  const response = await ticketService.getActivities(id)
  if (response.error) {
    return NextResponse.json({ error: response.error }, { status: 500 })
  }
  return NextResponse.json(response.data)
} 