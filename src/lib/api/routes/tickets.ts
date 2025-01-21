import getSupabaseClient from '@/lib/supabase/client'
import type { CreateTicketDTO, UpdateTicketDTO, TicketBase } from '@/lib/types'
import type { SupabaseClient } from '@supabase/supabase-js'

export const tickets = {
	async getAll(client?: SupabaseClient) {
		try {
			const supabase = client || getSupabaseClient()
			const { data, error } = await supabase
				.from('tickets')
				.select('*')
				.order('created_at', { ascending: false })

			if (error) {
				console.error('Supabase error:', error)
				throw error
			}
			if (!data) {
				console.error('No data returned from Supabase')
				throw new Error('Failed to load tickets')
			}
			return { data, error: null }
		} catch (err) {
			console.error('Get tickets error:', err)
			return { 
				data: null, 
				error: err instanceof Error ? err : new Error('Failed to load tickets') 
			}
		}
	},

	async getById(id: string, client?: SupabaseClient) {
		try {
			if (!id) {
				throw new Error('Ticket ID is required')
			}
			if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(id)) {
				throw new Error('Invalid ticket ID format')
			}

			const supabase = client || getSupabaseClient()
			const { data, error } = await supabase
				.from('tickets')
				.select('*')
				.eq('id', id)
				.single()

			if (error) {
				console.error('Supabase error:', error)
				throw error
			}
			if (!data) {
				throw new Error('Ticket not found')
			}
			return { data, error: null }
		} catch (err) {
			console.error('Get ticket error:', err)
			return { 
				data: null, 
				error: err instanceof Error ? err : new Error('Failed to get ticket') 
			}
		}
	},

	async create(data: CreateTicketDTO, client?: SupabaseClient) {
		try {
			console.log('Creating ticket with data:', data)

			// Validate required fields
			if (!data.title?.trim()) {
				throw new Error('Title is required')
			}
			if (data.title.length > 255) {
				throw new Error('Title must be at most 255 characters')
			}
			if (data.status && !['open', 'in_progress', 'closed'].includes(data.status)) {
				throw new Error('Invalid status value')
			}
			if (data.priority && !['low', 'medium', 'high'].includes(data.priority)) {
				throw new Error('Invalid priority value')
			}

			const supabase = client || getSupabaseClient()
			const { data: result, error } = await supabase
				.from('tickets')
				.insert([{
					...data,
					status: data.status || 'open',
					priority: data.priority || 'medium',
					metadata: data.metadata || {}
				}])

			if (error) {
				console.error('Supabase error:', error)
				throw error
			}
			if (!result) {
				console.error('No data returned from Supabase')
				throw new Error('Failed to create ticket')
			}
			return { data: result, error: null }
		} catch (err) {
			console.error('Create ticket error:', err)
			return { 
				data: null, 
				error: err instanceof Error ? err : new Error('Failed to create ticket') 
			}
		}
	},

	async update(id: string, data: UpdateTicketDTO, client?: SupabaseClient) {
		try {
			if (!id) {
				throw new Error('Ticket ID is required')
			}
			if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(id)) {
				throw new Error('Invalid uuid')
			}

			const supabase = client || getSupabaseClient()
			const { data: result, error } = await supabase
				.from('tickets')
				.update(data)
				.eq('id', id)
				.select()
				.single()

			if (error) {
				console.error('Supabase error:', error)
				throw error
			}
			if (!result) {
				throw new Error('Ticket not found')
			}
			return { data: result, error: null }
		} catch (err) {
			console.error('Update ticket error:', err)
			return { 
				data: null, 
				error: err instanceof Error ? err : new Error('Failed to update ticket') 
			}
		}
	},

	async delete(id: string, client?: SupabaseClient) {
		try {
			if (!id) {
				throw new Error('Ticket ID is required')
			}
			if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(id)) {
				throw new Error('Invalid uuid')
			}

			const supabase = client || getSupabaseClient()
			const { error } = await supabase
				.from('tickets')
				.delete()
				.eq('id', id)

			if (error) {
				console.error('Supabase error:', error)
				throw error
			}
			return { data: { success: true }, error: null }
		} catch (err) {
			console.error('Delete ticket error:', err)
			return { 
				data: null, 
				error: err instanceof Error ? err : new Error('Failed to delete ticket') 
			}
		}
	}
}