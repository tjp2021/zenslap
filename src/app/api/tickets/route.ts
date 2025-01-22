import { NextRequest } from 'next/server'
import { createHandler } from '@/lib/api/utils'
import { createTicketSchema } from '@/lib/validation/tickets'
import { ZodError } from 'zod'
import { createApiClient } from '@/lib/supabase/server'
import { Database } from '@/types/supabase'

type Ticket = Database['public']['Tables']['tickets']['Row']

// GET /api/tickets - List all tickets
export const GET = (req: NextRequest) => createHandler<Ticket[]>(req, async () => {
  const supabase = createApiClient()
  const { data, error } = await supabase
    .from('tickets')
    .select('*')
    .order('created_at', { ascending: false })
  
  if (error) throw error
  return data
})

// POST /api/tickets - Create a new ticket
export const POST = (req: NextRequest) => createHandler<Ticket>(req, async () => {
  const body = await req.json()
  const validatedData = createTicketSchema.parse(body)
  
  const supabase = createApiClient()
  const { data, error } = await supabase
    .from('tickets')
    .insert([validatedData])
    .select()
    .single()
  
  if (error) throw error
  return data
}) 