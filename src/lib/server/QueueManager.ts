'use server'

import { createApiClient } from '@/lib/supabase/server'
import type { Database } from '@/types/supabase'

type QueueStatus = 'pending' | 'processing' | 'completed' | 'failed'

interface QueueItem {
  id: string
  created_at: string
  status: QueueStatus
  type: string
  payload: Record<string, unknown>
}

export class QueueManager {
  async addToQueue(item: Omit<QueueItem, 'id' | 'created_at' | 'status'>) {
    try {
      const supabase = createApiClient()
      const { data, error } = await supabase
        .from('queue')
        .insert([{ ...item, status: 'pending' }])
        .select()
        .single()

      if (error) throw error
      return data as QueueItem
    } catch (error) {
      console.error('Failed to add item to queue:', error)
      throw error
    }
  }

  async getNextItem() {
    try {
      const supabase = createApiClient()
      const { data, error } = await supabase
        .from('queue')
        .select()
        .eq('status', 'pending')
        .order('created_at', { ascending: true })
        .limit(1)
        .single()

      if (error && error.code !== 'PGRST116') throw error
      return data as QueueItem | null
    } catch (error) {
      console.error('Failed to get next queue item:', error)
      throw error
    }
  }

  async updateStatus(id: string, status: QueueStatus) {
    try {
      const supabase = createApiClient()
      const { error } = await supabase
        .from('queue')
        .update({ status })
        .eq('id', id)

      if (error) throw error
    } catch (error) {
      console.error('Failed to update queue item status:', error)
      throw error
    }
  }

  async cleanupQueue(olderThan: Date) {
    try {
      const supabase = createApiClient()
      const { error } = await supabase
        .from('queue')
        .delete()
        .lt('created_at', olderThan.toISOString())
        .in('status', ['completed', 'failed'])

      if (error) throw error
    } catch (error) {
      console.error('Failed to cleanup queue:', error)
      throw error
    }
  }
} 