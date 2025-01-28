[?25l
    Select a project:                                                                          
                                                                                               
  >  1. hdxnigiahirrglzabmjz [name: ElitePrompts, org: vxumeaozvxtirgbxaeva, region: us-west-1]
    2. jzwlwrqurqbpgunoijay [name: ChatGenius, org: vxumeaozvxtirgbxaeva, region: us-west-1]   
    3. shoheafnpjmuqsiwstpp [name: ZenSlap, org: balxsqrfadtaghxkarsn, region: us-west-1]      
                                                                                               
                                                                                               
                                                                                               
                                                                                               
                                                                                               
                                                                                               
    ↑/k up • ↓/j down • / filter • q quit • ? more                                             
                                                                                               [0D[2K[1A[2K[1A[2K[1A[2K[1A[2K[1A[2K[1A[2K[1A[2K[1A[2K[1A[2K[1A[2K[1A[2K[1A[2K[1A[0D[2K [0D[2K[?25h[?1002l[?1003l[?1006l

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
      insight_feedback: {
        Row: {
          id: string
          pattern_id: string
          helpful: boolean
          accuracy: number
          relevance: number
          actionability: string
          comments?: string | null
          user_id?: string | null
          created_at: string
        }
        Insert: {
          id?: string
          pattern_id: string
          helpful: boolean
          accuracy: number
          relevance: number
          actionability: string
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
          actionability?: string
          comments?: string | null
          user_id?: string | null
          created_at?: string
        }
      }
      // ... other tables ...
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