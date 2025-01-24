import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/types/supabase'

type ResponseCategory = Database['public']['Tables']['response_categories']['Row']
type QuickResponse = Database['public']['Tables']['quick_responses']['Row']

// Categories
export async function getCategories() {
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('response_categories')
      .select('*')
      .order('name')

    if (error) throw error
    return data
  } catch (error) {
    console.error('Failed to fetch response categories:', error)
    throw error
  }
}

export async function createCategory(name: string) {
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('response_categories')
      .insert({ name })
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Failed to create response category:', error)
    throw error
  }
}

// Quick Responses
export const quickResponses = {
  async getAll() {
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('quick_responses')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      return { responses: data }
    } catch (error) {
      console.error('Failed to fetch quick responses:', error)
      throw error
    }
  },

  async create(title: string, content: string) {
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('quick_responses')
        .insert([{ title, content }])
        .select()
        .single()

      if (error) throw error
      return { response: data }
    } catch (error) {
      console.error('Failed to create quick response:', error)
      throw error
    }
  },

  async update(id: string, updates: Partial<QuickResponse>) {
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('quick_responses')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return { response: data }
    } catch (error) {
      console.error('Failed to update quick response:', error)
      throw error
    }
  },

  async delete(id: string) {
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('quick_responses')
        .delete()
        .eq('id', id)

      if (error) throw error
      return { success: true }
    } catch (error) {
      console.error('Failed to delete quick response:', error)
      throw error
    }
  }
} 