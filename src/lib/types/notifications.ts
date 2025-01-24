import { Database } from '@/lib/database.types'

export type Notification = Database['public']['Tables']['notifications']['Row']

export type NotificationWithDetails = Notification & {
  activity: {
    id: string
    ticket_id: string
    type: string
    content: string
    created_at: string
  }
  ticket: {
    id: string
    title: string
  }
} 