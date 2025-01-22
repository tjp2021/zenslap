import { NextResponse } from 'next/server'
import { ticketService } from '@/lib/api/routes/tickets'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const userId = searchParams.get('userId')
  
  if (!userId) {
    return NextResponse.json({ error: 'userId is required' }, { status: 400 })
  }

  const response = await ticketService.getCounts(userId)
  if (response.error) {
    return NextResponse.json({ error: response.error }, { status: 500 })
  }

  return NextResponse.json(response.data)
} 