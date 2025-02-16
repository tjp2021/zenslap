import { createServerClient } from '@/lib/supabase/component-server'
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
    const res = await fetch('/api/queue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item)
    })
    
    if (!res.ok) throw new Error('Failed to add to queue')
    return res.json()
  }

  async getNextItem(): Promise<QueueItem | null> {
    const res = await fetch('/api/queue')
    if (!res.ok) throw new Error('Failed to get next item')
    return res.json()
  }

  async updateStatus(id: string, status: QueueStatus) {
    try {
      const supabase = createServerClient()
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
      const supabase = createServerClient()
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