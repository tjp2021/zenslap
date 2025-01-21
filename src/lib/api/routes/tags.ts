import { SupabaseClient } from '@supabase/supabase-js'
import { Tag, CreateTagData, UpdateTagData } from '@/lib/types'
import { supabase } from '../supabase'

export const tags = {
    async getAll(client: SupabaseClient = supabase) {
        const { data, error } = await client
            .from('tags')
            .select('*')
            .order('created_at', { ascending: false })

        return { data: data as Tag[], error }
    },

    async getByTicketId(ticketId: string, client: SupabaseClient = supabase) {
        const { data, error } = await client
            .from('tags')
            .select('*')
            .contains('ticket_ids', [ticketId])
            .order('created_at', { ascending: false })

        return { data: data as Tag[], error }
    },

    async create(data: CreateTagData, client: SupabaseClient = supabase) {
        const { data: created, error } = await client
            .from('tags')
            .insert([data])
            .select()
            .single()

        return { data: created as Tag, error }
    },

    async update(id: string, data: UpdateTagData, client: SupabaseClient = supabase) {
        const { data: updated, error } = await client
            .from('tags')
            .update(data)
            .eq('id', id)
            .select()
            .single()

        return { data: updated as Tag, error }
    },

    async delete(id: string, client: SupabaseClient = supabase) {
        const { error } = await client
            .from('tags')
            .delete()
            .eq('id', id)

        return { data: null, error }
    }
} 