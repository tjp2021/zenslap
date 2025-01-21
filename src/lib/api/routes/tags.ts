import getSupabaseClient from '@/lib/supabase/client'
import type { Tag } from '@/lib/types'
import { createTagSchema, tagSchema } from '@/lib/validation'
import type { SupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'

export const tags = {
    async getAll(client?: SupabaseClient) {
        try {
            const supabase = client || getSupabaseClient()
            const { data, error } = await supabase
                .from('tags')
                .select('*')
                .order('name', { ascending: true })

            if (error) throw error
            if (!data) throw new Error('Failed to load tags')

            // Validate response data
            const validatedData = z.array(tagSchema).safeParse(data)
            if (!validatedData.success) {
                throw new Error('Invalid data format')
            }

            return { data: validatedData.data, error: null }
        } catch (err) {
            console.error('Get tags error:', err)
            return { 
                data: null, 
                error: err instanceof Error ? err : new Error('Failed to load tags') 
            }
        }
    },

    async create(data: z.infer<typeof createTagSchema>, client?: SupabaseClient) {
        try {
            // Validate input data
            const validatedData = createTagSchema.parse(data)

            const supabase = client || getSupabaseClient()
            const { data: result, error } = await supabase
                .from('tags')
                .insert([validatedData])
                .select()
                .single()

            if (error) {
                if (error.code === '23505') { // Unique violation
                    throw new Error('Tag name already exists')
                }
                throw error
            }
            if (!result) throw new Error('Failed to create tag')

            // Validate response data
            const validatedResult = tagSchema.parse(result)
            return { data: validatedResult, error: null }
        } catch (err) {
            console.error('Create tag error:', err)
            return { 
                data: null, 
                error: err instanceof Error ? err : new Error('Failed to create tag') 
            }
        }
    },

    async update(id: string, data: Partial<z.infer<typeof createTagSchema>>, client?: SupabaseClient) {
        try {
            if (!id) throw new Error('Tag ID is required')

            // Validate input data
            const validatedData = createTagSchema.partial().parse(data)

            const supabase = client || getSupabaseClient()
            const { data: result, error } = await supabase
                .from('tags')
                .update(validatedData)
                .eq('id', id)
                .select()
                .single()

            if (error) {
                if (error.code === '23505') { // Unique violation
                    throw new Error('Tag name already exists')
                }
                throw error
            }
            if (!result) throw new Error('Tag not found')

            // Validate response data
            const validatedResult = tagSchema.parse(result)
            return { data: validatedResult, error: null }
        } catch (err) {
            console.error('Update tag error:', err)
            return { 
                data: null, 
                error: err instanceof Error ? err : new Error('Failed to update tag') 
            }
        }
    },

    async delete(id: string, client?: SupabaseClient) {
        try {
            if (!id) throw new Error('Tag ID is required')

            const supabase = client || getSupabaseClient()
            const { error } = await supabase
                .from('tags')
                .delete()
                .eq('id', id)

            if (error) throw error

            return { data: { success: true }, error: null }
        } catch (err) {
            console.error('Delete tag error:', err)
            return { 
                data: null, 
                error: err instanceof Error ? err : new Error('Failed to delete tag') 
            }
        }
    },

    async getByTicketId(ticketId: string, client?: SupabaseClient) {
        try {
            if (!ticketId) throw new Error('Ticket ID is required')

            const supabase = client || getSupabaseClient()
            const { data, error } = await supabase
                .from('tags')
                .select('*, ticket_tags!inner(*)')
                .eq('ticket_tags.ticket_id', ticketId)

            if (error) throw error
            if (!data) throw new Error('Failed to load tags')

            // Validate response data
            const validatedData = z.array(tagSchema).safeParse(data)
            if (!validatedData.success) {
                throw new Error('Invalid data format')
            }

            return { data: validatedData.data, error: null }
        } catch (err) {
            console.error('Get ticket tags error:', err)
            return { 
                data: null, 
                error: err instanceof Error ? err : new Error('Failed to load ticket tags') 
            }
        }
    }
} 