import getSupabaseClient from '@/lib/supabase/client'
import { createTicketMessageSchema, ticketMessageSchema } from '@/lib/validation'
import type { SupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'

export const messages = {
    async getByTicketId(ticketId: string, client?: SupabaseClient) {
        try {
            if (!ticketId) throw new Error('Ticket ID is required')

            const supabase = client || getSupabaseClient()
            const { data, error } = await supabase
                .from('ticket_messages')
                .select('*')
                .eq('ticket_id', ticketId)
                .order('created_at', { ascending: true })

            if (error) throw error
            if (!data) throw new Error('Failed to load messages')

            // Validate response data
            const validatedData = z.array(ticketMessageSchema).safeParse(data)
            if (!validatedData.success) {
                throw new Error('Invalid data format')
            }

            return { data: validatedData.data, error: null }
        } catch (err) {
            console.error('Get messages error:', err)
            return { 
                data: null, 
                error: err instanceof Error ? err : new Error('Failed to load messages') 
            }
        }
    },

    async create(data: z.infer<typeof createTicketMessageSchema>, userId: string, client?: SupabaseClient) {
        try {
            // Validate input data
            const validatedData = createTicketMessageSchema.parse(data)

            const supabase = client || getSupabaseClient()

            // First verify the ticket exists
            const { data: ticket, error: ticketError } = await supabase
                .from('tickets')
                .select('id')
                .eq('id', validatedData.ticket_id)
                .single()

            if (ticketError) throw ticketError
            if (!ticket) throw new Error('Ticket not found')

            // Create the message
            const { data: result, error } = await supabase
                .from('ticket_messages')
                .insert([{
                    ...validatedData,
                    created_by: userId
                }])
                .select()
                .single()

            if (error) throw error
            if (!result) throw new Error('Failed to create message')

            // Validate response data
            const validatedResult = ticketMessageSchema.parse(result)
            return { data: validatedResult, error: null }
        } catch (err) {
            console.error('Create message error:', err)
            return { 
                data: null, 
                error: err instanceof Error ? err : new Error('Failed to create message') 
            }
        }
    },

    async update(id: string, content: string, userId: string, client?: SupabaseClient) {
        try {
            if (!id) throw new Error('Message ID is required')
            if (!content?.trim()) throw new Error('Content is required')

            const supabase = client || getSupabaseClient()
            
            // First check if the user is the creator of the message
            const { data: existingMessage, error: fetchError } = await supabase
                .from('ticket_messages')
                .select('created_by, type')
                .eq('id', id)
                .single()

            if (fetchError) throw fetchError
            if (!existingMessage) throw new Error('Message not found')
            
            // Only allow update if user is creator or an admin
            const { data: user } = await supabase.auth.getUser()
            const isAdmin = user?.user?.user_metadata?.role === 'ADMIN'
            
            if (!isAdmin && existingMessage.created_by !== userId) {
                throw new Error('Not authorized to update this message')
            }

            // Update the message
            const { data: result, error } = await supabase
                .from('ticket_messages')
                .update({ content })
                .eq('id', id)
                .select()
                .single()

            if (error) throw error
            if (!result) throw new Error('Failed to update message')

            // Validate response data
            const validatedResult = ticketMessageSchema.parse(result)
            return { data: validatedResult, error: null }
        } catch (err) {
            console.error('Update message error:', err)
            return { 
                data: null, 
                error: err instanceof Error ? err : new Error('Failed to update message') 
            }
        }
    },

    async delete(id: string, userId: string, client?: SupabaseClient) {
        try {
            if (!id) throw new Error('Message ID is required')

            const supabase = client || getSupabaseClient()

            // First check if the user is the creator of the message
            const { data: existingMessage, error: fetchError } = await supabase
                .from('ticket_messages')
                .select('created_by, type')
                .eq('id', id)
                .single()

            if (fetchError) throw fetchError
            if (!existingMessage) throw new Error('Message not found')

            // Only allow deletion if user is creator or an admin
            const { data: user } = await supabase.auth.getUser()
            const isAdmin = user?.user?.user_metadata?.role === 'ADMIN'
            
            if (!isAdmin && existingMessage.created_by !== userId) {
                throw new Error('Not authorized to delete this message')
            }

            // Delete the message
            const { error } = await supabase
                .from('ticket_messages')
                .delete()
                .eq('id', id)

            if (error) throw error

            return { data: { success: true }, error: null }
        } catch (err) {
            console.error('Delete message error:', err)
            return { 
                data: null, 
                error: err instanceof Error ? err : new Error('Failed to delete message') 
            }
        }
    }
} 