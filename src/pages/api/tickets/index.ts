import { NextApiRequest, NextApiResponse } from 'next'
import { ticketService } from '@/lib/api/routes/tickets'
import { createTicketSchema } from '@/lib/validation/tickets'
import { ZodError } from 'zod'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  switch (req.method) {
    case 'GET':
      return handleGet(req, res)
    case 'POST':
      return handlePost(req, res)
    default:
      res.setHeader('Allow', ['GET', 'POST'])
      return res.status(405).json({ error: `Method ${req.method} Not Allowed` })
  }
}

// GET /api/tickets - List all tickets
async function handleGet(req: NextApiRequest, res: NextApiResponse) {
  const { data, error } = await ticketService.getAll()
  
  if (error) {
    return res.status(500).json({ error: error.message || 'Failed to fetch tickets' })
  }
  
  return res.status(200).json({ data })
}

// POST /api/tickets - Create a new ticket
async function handlePost(req: NextApiRequest, res: NextApiResponse) {
  try {
    console.log('Received ticket data:', req.body)
    const validatedData = createTicketSchema.parse(req.body)
    console.log('Validated data:', validatedData)
    
    const { data, error } = await ticketService.create(validatedData)
    console.log('Service response:', { data, error })

    if (error) {
      console.error('Service error:', error)
      return res.status(400).json({ error: error.message || 'Failed to create ticket' })
    }

    return res.status(201).json({ data })
  } catch (err) {
    console.error('API error:', err)
    if (err instanceof ZodError) {
      return res.status(400).json({ error: err.errors[0].message })
    }
    return res.status(500).json({ error: 'Failed to create ticket' })
  }
} 