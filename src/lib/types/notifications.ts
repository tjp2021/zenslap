import { Database } from '@/lib/database.types'

export type Notification = Database['public']['Tables']['notifications']['Row']

export interface NotificationMetadata {
  reasoning: string
  suggestedActions?: string[]
  relatedPatterns?: string[]
  modelInfo: {
    provider: string
    model: string
    version?: string
  }
}

export interface NotificationWithDetails extends Notification {
  priority?: 'high' | 'medium' | 'low'
  confidence?: number
  ai_metadata?: NotificationMetadata
  activity: {
    id: string
    ticket_id: string
    activity_type: string
    content: any
    created_at: string
    ticket: {
      id: string
      title: string
    }
  }
} 