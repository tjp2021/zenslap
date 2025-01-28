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
      ai_analyses: {
        Row: {
          id: string
          ticketId: string
          type: string
          result: Json
          confidence: number
          timestamp: string
          modelInfo: {
            provider: string
            model: string
            version?: string
          }
        }
        Insert: Omit<Database['public']['Tables']['ai_analyses']['Row'], 'id'>
        Update: Partial<Database['public']['Tables']['ai_analyses']['Row']>
      }
      ai_config: {
        Row: {
          id: string
          provider: string
          model: string
          apiKey?: string
          options?: Json
        }
        Insert: Omit<Database['public']['Tables']['ai_config']['Row'], 'id'>
        Update: Partial<Database['public']['Tables']['ai_config']['Row']>
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