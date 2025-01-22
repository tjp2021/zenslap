'use server'

import { NextResponse } from 'next/server'
import { ticketService } from '@/lib/api/routes/tickets'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')
  const priority = searchParams.get('priority')
  const assignee = searchParams.get('assignee')
  
  const response = await ticketService.getAll()
  if (response.error) {
    return NextResponse.json({ error: response.error }, { status: 500 })
  }

  let tickets = response.data || []
  
  // Apply filters
  if (status) {
    tickets = tickets.filter(t => t.status === status)
  }
  if (priority) {
    tickets = tickets.filter(t => t.priority === priority)
  }
  if (assignee) {
    tickets = tickets.filter(t => t.assignee === assignee)
  }
  
  return NextResponse.json(tickets)
}

export async function POST(request: Request) {
  const body = await request.json()
  const response = await ticketService.create(body)
  
  if (response.error) {
    return NextResponse.json({ error: response.error }, { status: 500 })
  }
  
  return NextResponse.json(response.data)
}

export async function PATCH(request: Request) {
  const { id, ...updates } = await request.json()
  const response = await ticketService.update(id, updates)
  
  if (response.error) {
    return NextResponse.json({ error: response.error }, { status: 500 })
  }
  
  return NextResponse.json(response.data)
} 