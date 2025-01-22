export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          created_at: string
        }
        Insert: {
          id?: string
          email: string
          created_at?: string
        }
        Update: {
          id?: string
          email?: string
          created_at?: string
        }
      }
      tickets: {
        Row: {
          id: string
          title: string
          description: string
          status: 'open' | 'in_progress' | 'resolved' | 'closed'
          priority: 'low' | 'medium' | 'high'
          created_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          id?: string
          title: string
          description: string
          status?: 'open' | 'in_progress' | 'resolved' | 'closed'
          priority?: 'low' | 'medium' | 'high'
          created_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          id?: string
          title?: string
          description?: string
          status?: 'open' | 'in_progress' | 'resolved' | 'closed'
          priority?: 'low' | 'medium' | 'high'
          created_at?: string
          updated_at?: string
          user_id?: string
        }
      }
      queue: {
        Row: {
          id: string
          created_at: string
          status: 'pending' | 'processing' | 'completed' | 'failed'
          type: string
          payload: Json
        }
        Insert: {
          id?: string
          created_at?: string
          status?: 'pending' | 'processing' | 'completed' | 'failed'
          type: string
          payload: Json
        }
        Update: {
          id?: string
          created_at?: string
          status?: 'pending' | 'processing' | 'completed' | 'failed'
          type?: string
          payload?: Json
        }
      }
      quick_responses: {
        Row: {
          id: string
          title: string
          content: string
          created_at: string
          updated_at: string
          category_id?: string
        }
        Insert: {
          id?: string
          title: string
          content: string
          created_at?: string
          updated_at?: string
          category_id?: string
        }
        Update: {
          id?: string
          title?: string
          content?: string
          created_at?: string
          updated_at?: string
          category_id?: string
        }
      }
      response_categories: {
        Row: {
          id: string
          name: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
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