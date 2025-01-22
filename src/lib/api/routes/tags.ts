import { Tag, CreateTagData, UpdateTagData } from '@/lib/types'
import { createApiClient } from '@/lib/supabase/server'

export const tags = {
    async getAll() {
        const supabase = createApiClient()
        const { data, error } = await supabase
            .from('tags')
            .select('*')
            .order('created_at', { ascending: false })

        return { data: data as Tag[], error }
    },

    async getByTicketId(ticketId: string) {
        const supabase = createApiClient()
        const { data, error } = await supabase
            .from('tags')
            .select('*')
            .contains('ticket_ids', [ticketId])
            .order('created_at', { ascending: false })

        return { data: data as Tag[], error }
    },

    async create(data: CreateTagData) {
        const supabase = createApiClient()
        const { data: created, error } = await supabase
            .from('tags')
            .insert([data])
            .select()
            .single()

        return { data: created as Tag, error }
    },

    async update(id: string, data: UpdateTagData) {
        const supabase = createApiClient()
        const { data: updated, error } = await supabase
            .from('tags')
            .update(data)
            .eq('id', id)
            .select()
            .single()

        return { data: updated as Tag, error }
    },

    async delete(id: string) {
        const supabase = createApiClient()
        const { error } = await supabase
            .from('tags')
            .delete()
            .eq('id', id)

        return { data: null, error }
    }
} 