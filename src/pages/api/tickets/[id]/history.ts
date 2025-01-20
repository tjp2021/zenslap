import { NextApiRequest, NextApiResponse } from 'next'
import { supabase } from '@/lib/supabase/client'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { id } = req.query

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { data, error } = await supabase
      .from('ticket_history')
      .select('*')
      .eq('ticket_id', id)
      .order('created_at', { ascending: false })

    if (error) throw error

    return res.status(200).json({ data })
  } catch (error) {
    console.error('Error fetching ticket history:', error)
    return res.status(500).json({ error: 'Failed to fetch ticket history' })
  }
} 