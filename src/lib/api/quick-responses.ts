import { supabase } from '@/lib/supabase/client'
import type {
  ResponseCategory,
  QuickResponse,
  CreateResponseCategoryData,
  CreateQuickResponseData,
  UpdateQuickResponseData,
} from '@/lib/types/quick-responses'

// Categories
export async function getCategories() {
  const { data, error } = await supabase
    .from('response_categories')
    .select('*')
    .order('name')

  if (error) throw error
  return data as ResponseCategory[]
}

export async function createCategory(data: CreateResponseCategoryData) {
  const { data: category, error } = await supabase
    .from('response_categories')
    .insert(data)
    .select()
    .single()

  if (error) throw error
  return category as ResponseCategory
}

// Quick Responses
export async function getResponses(categoryId?: string) {
  let query = supabase.from('quick_responses').select('*')
  
  if (categoryId) {
    query = query.eq('category_id', categoryId)
  }

  const { data, error } = await query.order('title')

  if (error) throw error
  return data as QuickResponse[]
}

export async function createResponse(data: CreateQuickResponseData) {
  const { data: response, error } = await supabase
    .from('quick_responses')
    .insert(data)
    .select()
    .single()

  if (error) throw error
  return response as QuickResponse
}

export async function updateResponse(data: UpdateQuickResponseData) {
  const { data: response, error } = await supabase
    .from('quick_responses')
    .update(data)
    .eq('id', data.id)
    .select()
    .single()

  if (error) throw error
  return response as QuickResponse
}

export async function deleteResponse(id: string) {
  const { error } = await supabase
    .from('quick_responses')
    .delete()
    .eq('id', id)

  if (error) throw error
} 