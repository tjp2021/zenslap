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
