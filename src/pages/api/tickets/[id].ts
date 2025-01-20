import { NextApiRequest, NextApiResponse } from 'next'
import { ticketService } from '@/lib/api/routes/tickets'
import { updateTicketSchema } from '@/lib/validation/tickets'
import { ZodError } from 'zod'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query
  
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid ticket ID' })
  }

  switch (req.method) {
    case 'GET':
      return handleGet(req, res, id)
    case 'PUT':
      return handlePut(req, res, id)
    case 'DELETE':
      return handleDelete(req, res, id)
    default:
      res.setHeader('Allow', ['GET', 'PUT', 'DELETE'])
      return res.status(405).json({ error: `Method ${req.method} Not Allowed` })
  }
}

// GET /api/tickets/[id] - Get a specific ticket
async function handleGet(req: NextApiRequest, res: NextApiResponse, id: string) {
  const { data, error } = await ticketService.getById(id)
  
  if (error) {
    return res.status(404).json({ error })
  }

  return res.status(200).json({ data })
}

// PUT /api/tickets/[id] - Update a ticket
async function handlePut(req: NextApiRequest, res: NextApiResponse, id: string) {
  try {
    const validatedData = updateTicketSchema.parse({ ...req.body, id })
    const { data, error } = await ticketService.update(validatedData)

    if (error) {
      return res.status(400).json({ error })
    }

    return res.status(200).json({ data })
  } catch (err) {
    if (err instanceof ZodError) {
      return res.status(400).json({ error: err.errors[0].message })
    }
    return res.status(500).json({ error: 'Failed to update ticket' })
  }
}

// DELETE /api/tickets/[id] - Delete a ticket
async function handleDelete(req: NextApiRequest, res: NextApiResponse, id: string) {
  const { error } = await ticketService.delete(id)
  
  if (error) {
    return res.status(400).json({ error })
  }

  return res.status(204).end()
} 