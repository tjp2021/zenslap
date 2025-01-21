export interface Database {
  public: {
    Tables: {
      tickets: {
        Row: {
          id: string
          title: string
          description: string
          status: 'new' | 'open' | 'pending' | 'resolved' | 'closed'
          priority: 'low' | 'medium' | 'high' | 'urgent'
          created_at: string
          updated_at: string
          created_by: string
          assigned_to?: string
          metadata?: Record<string, any>
        }
        Insert: Omit<Tables['tickets']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Tables['tickets']['Row']>
      }
      tags: {
        Row: {
          id: string
          name: string
          color: string
          created_at: string
          created_by: string
        }
        Insert: Omit<Tables['tags']['Row'], 'id' | 'created_at'>
        Update: Partial<Tables['tags']['Row']>
      }
      ticket_tags: {
        Row: {
          id: string
          ticket_id: string
          tag_id: string
          created_at: string
          created_by: string
        }
        Insert: Omit<Tables['ticket_tags']['Row'], 'id' | 'created_at'>
        Update: Partial<Tables['ticket_tags']['Row']>
      }
      internal_notes: {
        Row: {
          id: string
          ticket_id: string
          content: string
          created_at: string
          created_by: string
          updated_at: string
        }
        Insert: Omit<Tables['internal_notes']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Tables['internal_notes']['Row']>
      }
      messages: {
        Row: {
          id: string
          ticket_id: string
          content: string
          created_at: string
          created_by: string
          updated_at: string
        }
        Insert: Omit<Tables['messages']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Tables['messages']['Row']>
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

// Helper type to access nested types
type Tables = Database['public']['Tables']

export interface DatabaseConfig {
  host: string
  port: number
  database: string
  schema?: string
  ssl?: boolean
  options?: Record<string, unknown>
} 