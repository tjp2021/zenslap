export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type ActivityType = 'comment' | 'note' | 'status_change' | 'field_change'

export interface ActivityContent {
  comment: {
    message: string
    format: 'text'
  }
  note: {
    message: string
    format: 'text'
  }
  status_change: {
    from: string
    to: string
  }
  field_change: {
    field: string
    from: string
    to: string
  }
}

export interface Database {
  public: {
    Tables: {
      tickets: {
        Row: {
          id: string
          title: string
          description: string
          status: 'open' | 'in_progress' | 'resolved' | 'closed'
          priority: 'low' | 'medium' | 'high' | 'urgent'
          metadata: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          description: string
          status?: 'open' | 'in_progress' | 'resolved' | 'closed'
          priority?: 'low' | 'medium' | 'high' | 'urgent'
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string
          status?: 'open' | 'in_progress' | 'resolved' | 'closed'
          priority?: 'low' | 'medium' | 'high' | 'urgent'
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
      }
      ticket_activities: {
        Row: {
          id: string
          ticket_id: string
          actor_id: string
          activity_type: ActivityType
          is_internal: boolean
          parent_id: string | null
          content: ActivityContent[keyof ActivityContent]
          created_at: string
        }
        Insert: {
          id?: string
          ticket_id: string
          actor_id: string
          activity_type: ActivityType
          is_internal?: boolean
          parent_id?: string | null
          content: ActivityContent[keyof ActivityContent]
          created_at?: string
        }
        Update: {
          id?: string
          ticket_id?: string
          actor_id?: string
          activity_type?: ActivityType
          is_internal?: boolean
          parent_id?: string | null
          content?: ActivityContent[keyof ActivityContent]
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
} 