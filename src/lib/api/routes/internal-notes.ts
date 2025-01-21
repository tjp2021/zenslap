import getSupabaseClient from '@/lib/supabase/client'
import { createInternalNoteSchema, internalNoteSchema } from '@/lib/validation'
import type { SupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'

export const internalNotes = {
    async getByTicketId(ticketId: string, client?: SupabaseClient) {
        try {
            if (!ticketId) throw new Error('Ticket ID is required')

            const supabase = client || getSupabaseClient()
            const { data, error } = await supabase
                .from('internal_notes')
                .select('*')
                .eq('ticket_id', ticketId)
                .order('created_at', { ascending: true })

            if (error) throw error
            if (!data) throw new Error('Failed to load internal notes')

            // Validate response data
            const validatedData = z.array(internalNoteSchema).safeParse(data)
            if (!validatedData.success) {
                throw new Error('Invalid data format')
            }

            return { data: validatedData.data, error: null }
        } catch (err) {
            console.error('Get internal notes error:', err)
            return { 
                data: null, 
                error: err instanceof Error ? err : new Error('Failed to load internal notes') 
            }
        }
    },

    async create(data: z.infer<typeof createInternalNoteSchema>, userId: string, client?: SupabaseClient) {
        try {
            // Validate input data
            const validatedData = createInternalNoteSchema.parse(data)

            const supabase = client || getSupabaseClient()
            const { data: result, error } = await supabase
                .from('internal_notes')
                .insert([{
                    ...validatedData,
                    created_by: userId
                }])
                .select()
                .single()

            if (error) throw error
            if (!result) throw new Error('Failed to create internal note')

            // Validate response data
            const validatedResult = internalNoteSchema.parse(result)
            return { data: validatedResult, error: null }
        } catch (err) {
            console.error('Create internal note error:', err)
            return { 
                data: null, 
                error: err instanceof Error ? err : new Error('Failed to create internal note') 
            }
        }
    },

    async update(id: string, content: string, userId: string, client?: SupabaseClient) {
        try {
            if (!id) throw new Error('Note ID is required')
            if (!content?.trim()) throw new Error('Content is required')

            const supabase = client || getSupabaseClient()
            
            // First check if the user is the creator of the note
            const { data: existingNote, error: fetchError } = await supabase
                .from('internal_notes')
                .select('created_by')
                .eq('id', id)
                .single()

            if (fetchError) throw fetchError
            if (!existingNote) throw new Error('Note not found')
            if (existingNote.created_by !== userId) throw new Error('Not authorized to update this note')

            // Update the note
            const { data: result, error } = await supabase
                .from('internal_notes')
                .update({ content })
                .eq('id', id)
                .select()
                .single()

            if (error) throw error
            if (!result) throw new Error('Failed to update internal note')

            // Validate response data
            const validatedResult = internalNoteSchema.parse(result)
            return { data: validatedResult, error: null }
        } catch (err) {
            console.error('Update internal note error:', err)
            return { 
                data: null, 
                error: err instanceof Error ? err : new Error('Failed to update internal note') 
            }
        }
    },

    async delete(id: string, userId: string, client?: SupabaseClient) {
        try {
            if (!id) throw new Error('Note ID is required')

            const supabase = client || getSupabaseClient()

            // First check if the user is the creator of the note
            const { data: existingNote, error: fetchError } = await supabase
                .from('internal_notes')
                .select('created_by')
                .eq('id', id)
                .single()

            if (fetchError) throw fetchError
            if (!existingNote) throw new Error('Note not found')
            if (existingNote.created_by !== userId) throw new Error('Not authorized to delete this note')

            // Delete the note
            const { error } = await supabase
                .from('internal_notes')
                .delete()
                .eq('id', id)

            if (error) throw error

            return { data: { success: true }, error: null }
        } catch (err) {
            console.error('Delete internal note error:', err)
            return { 
                data: null, 
                error: err instanceof Error ? err : new Error('Failed to delete internal note') 
            }
        }
    }
} 