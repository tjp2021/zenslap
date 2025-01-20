import { supabase } from '@/lib/supabase/client'
import type { CreateTicketDTO, UpdateTicketDTO, TicketBase } from '@/lib/types'

export const ticketService = {
	async getAll() {
		try {
			const { data, error } = await supabase
				.from('tickets')
				.select('*')
				.order('created_at', { ascending: false })

			if (error) throw error
			return { data, error: null }
		} catch (err) {
			return { 
				data: null, 
				error: err instanceof Error ? err : new Error('Failed to fetch tickets') 
			}
		}
	},

	async getById(id: string) {
		try {
			const { data, error } = await supabase
				.from('tickets')
				.select('*')
				.eq('id', id)
				.single()

			if (error) throw error
			if (!data) throw new Error('Ticket not found')
			return { data, error: null }
		} catch (err) {
			return { 
				data: null, 
				error: err instanceof Error ? err : new Error('Failed to fetch ticket') 
			}
		}
	},

	async create(ticket: CreateTicketDTO) {
		try {
			console.log('Creating ticket with data:', ticket)
			if (!supabase) {
				throw new Error('Supabase client is not initialized')
			}

			const { data, error } = await supabase
				.from('tickets')
				.insert([{
					...ticket,
					status: ticket.status || 'open',
					priority: ticket.priority || 'medium',
					metadata: ticket.metadata || {}
				}])
				.select()
				.single()

			if (error) {
				console.error('Supabase error:', error)
				throw error
			}
			if (!data) {
				console.error('No data returned from Supabase')
				throw new Error('Failed to create ticket')
			}
			return { data, error: null }
		} catch (err) {
			console.error('Create ticket error:', err)
			return { 
				data: null, 
				error: err instanceof Error ? err : new Error('Failed to create ticket') 
			}
		}
	},

	async update(data: UpdateTicketDTO) {
		try {
			const { id, ...updates } = data
			const { data: ticket, error } = await supabase
				.from('tickets')
				.update({
					...updates,
					updated_at: new Date().toISOString()
				})
				.eq('id', id)
				.select()
				.single()

			if (error) throw error
			if (!ticket) throw new Error('Ticket not found')
			return { data: ticket, error: null }
		} catch (err) {
			return { 
				data: null, 
				error: err instanceof Error ? err : new Error('Failed to update ticket') 
			}
		}
	},

	async delete(id: string) {
		try {
			const { error } = await supabase
				.from('tickets')
				.delete()
				.eq('id', id)

			if (error) throw error
			return { error: null }
		} catch (err) {
			return { 
				error: err instanceof Error ? err : new Error('Failed to delete ticket') 
			}
		}
	}
}