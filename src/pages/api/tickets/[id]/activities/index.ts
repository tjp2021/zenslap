import { NextApiRequest, NextApiResponse } from 'next'
import { createActivitySchema } from '@/lib/validation/tickets'
import { supabase } from '@/lib/supabase/client'
import { createServerSupabaseClient } from '@supabase/auth-helpers-nextjs'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const supabaseServerClient = createServerSupabaseClient({ req, res })
  const { data: { session }, error: authError } = await supabaseServerClient.auth.getSession()

  if (authError || !session) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const { id: ticketId } = req.query
  if (!ticketId || typeof ticketId !== 'string') {
    return res.status(400).json({ error: 'Invalid ticket ID' })
  }

  switch (req.method) {
    case 'GET':
      return handleGet(req, res, ticketId)
    case 'POST':
      return handlePost(req, res, ticketId, session.user.id)
    default:
      return res.status(405).json({ error: 'Method not allowed' })
  }
}

async function handleGet(
  req: NextApiRequest,
  res: NextApiResponse,
  ticketId: string
) {
  const { data: activities, error } = await supabase
    .from('ticket_activities')
    .select('*')
    .eq('ticket_id', ticketId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching activities:', error)
    return res.status(500).json({ error: 'Failed to fetch activities' })
  }

  return res.status(200).json(activities)
}

async function handlePost(
  req: NextApiRequest,
  res: NextApiResponse,
  ticketId: string,
  actorId: string
) {
  try {
    const validatedData = createActivitySchema.parse({
      ...req.body,
      ticket_id: ticketId
    })

    const { data: activity, error } = await supabase
      .from('ticket_activities')
      .insert({
        ...validatedData,
        actor_id: actorId
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating activity:', error)
      return res.status(500).json({ error: 'Failed to create activity' })
    }

    return res.status(201).json(activity)
  } catch (error) {
    if (error instanceof Error) {
      return res.status(400).json({ error: error.message })
    }
    return res.status(500).json({ error: 'An unexpected error occurred' })
  }
} 