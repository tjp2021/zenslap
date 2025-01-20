import { NextApiRequest, NextApiResponse } from 'next'
import { createClient, SupabaseClient } from '@supabase/supabase-js'

export type RouteHandler = (
	req: NextApiRequest, 
	res: NextApiResponse, 
	supabase: SupabaseClient
) => Promise<any>

/**
 * Creates a route handler with error handling and Supabase client injection
 */
export function createRouteHandler(handler: RouteHandler) {
	return async (req: NextApiRequest, res: NextApiResponse) => {
		try {
			const supabase = createClient(
				process.env.NEXT_PUBLIC_SUPABASE_URL!,
				process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
			)

			await handler(req, res, supabase)
		} catch (error: any) {
			console.error('API Error:', error)
			res.status(500).json({ 
				error: 'Internal Server Error',
				details: process.env.NODE_ENV === 'development' 
					? error.message || error 
					: undefined
			})
		}
	}
} 