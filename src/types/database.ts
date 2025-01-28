export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      insight_feedback: {
        Row: {
          id: string
          pattern_id: string
          helpful: boolean
          accuracy: number
          relevance: number
          actionability: 'high' | 'medium' | 'low' | 'neutral'
          comments: string | null
          user_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          pattern_id: string
          helpful: boolean
          accuracy: number
          relevance: number
          actionability: 'high' | 'medium' | 'low' | 'neutral'
          comments?: string | null
          user_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          pattern_id?: string
          helpful?: boolean
          accuracy?: number
          relevance?: number
          actionability?: 'high' | 'medium' | 'low' | 'neutral'
          comments?: string | null
          user_id?: string | null
          created_at?: string
        }
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
} 