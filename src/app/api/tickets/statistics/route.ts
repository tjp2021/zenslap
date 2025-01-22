import { NextResponse } from 'next/server'
import { ticketService } from '@/lib/api/routes/tickets'

export async function GET() {
  const response = await ticketService.getStatistics()
  if (response.error) {
    return NextResponse.json({ error: response.error }, { status: 500 })
  }
  return NextResponse.json(response.data)
} 