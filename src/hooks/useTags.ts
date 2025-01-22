'use client'

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '@/types/supabase'
import useSWR from 'swr'

export function useTags() {
  const supabase = createClientComponentClient<Database>()

  const { data: tags, error, mutate } = useSWR('tags', async () => {
    const { data, error } = await supabase
      .from('tags')
      .select('*')
      .order('name', { ascending: true })

    if (error) throw error
    return data || []
  })

  const addTag = async (name: string) => {
    const { data, error } = await supabase
      .from('tags')
      .insert([{ name }])
      .select()
      .single()

    if (error) throw error
    await mutate()
    return data
  }

  const removeTag = async (id: string) => {
    const { error } = await supabase
      .from('tags')
      .delete()
      .eq('id', id)

    if (error) throw error
    await mutate()
  }

  return {
    tags: tags || [],
    isLoading: !tags && !error,
    error,
    addTag,
    removeTag
  }
} 