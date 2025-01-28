export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          operationName?: string
          query?: string
          variables?: Json
          extensions?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      internal_notes: {
        Row: {
          content: string
          created_at: string | null
          created_by: string
          id: string
          mentions: string[] | null
          ticket_id: string
          updated_at: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          created_by: string
          id?: string
          mentions?: string[] | null
          ticket_id: string
          updated_at?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          created_by?: string
          id?: string
          mentions?: string[] | null
          ticket_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "internal_notes_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          activity_id: string
          created_at: string
          id: string
          read: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          activity_id: string
          created_at?: string
          id?: string
          read?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          activity_id?: string
          created_at?: string
          id?: string
          read?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string | null
          id: string
          role: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          id: string
          role?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          id?: string
          role?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      ticket_activities: {
        Row: {
          activity_type: string
          actor_id: string | null
          content: Json
          created_at: string
          id: string
          mentioned_user_ids: string[] | null
          ticket_id: string
        }
        Insert: {
          activity_type: string
          actor_id?: string | null
          content: Json
          created_at?: string
          id?: string
          mentioned_user_ids?: string[] | null
          ticket_id: string
        }
        Update: {
          activity_type?: string
          actor_id?: string | null
          content?: Json
          created_at?: string
          id?: string
          mentioned_user_ids?: string[] | null
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_activities_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      tickets: {
        Row: {
          assignee: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          metadata: Json | null
          priority: string
          status: string
          tags: string[] | null
          title: string
          updated_at: string | null
          crisis_type: 'suicide_risk' | 'self_harm' | 'panic_attack' | 'medical_emergency' | 'severe_distress' | 'emotional_distress' | 'cultural_distress' | 'general_stress' | 'mental_health' | null
          severity_level: 'critical' | 'high' | 'medium' | 'low' | null
          response_protocol: 'immediate_intervention' | 'emergency_services' | 'rapid_response' | 'urgent_intervention' | 'standard_response' | null
          requires_immediate: boolean | null
          has_actionable_plan: boolean | null
          is_passive_ideation: boolean | null
          escalated_from: string | null // UUID
          location_based: boolean | null
          cultural_context: string | null
          is_metaphorical: boolean | null
          is_general_inquiry: boolean | null
          last_crisis_assessment_at: string | null // timestamptz
        }
        Insert: {
          assignee?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          metadata?: Json | null
          priority?: string
          status?: string
          tags?: string[] | null
          title: string
          updated_at?: string | null
          crisis_type?: 'suicide_risk' | 'self_harm' | 'panic_attack' | 'medical_emergency' | 'severe_distress' | 'emotional_distress' | 'cultural_distress' | 'general_stress' | 'mental_health' | null
          severity_level?: 'critical' | 'high' | 'medium' | 'low' | null
          response_protocol?: 'immediate_intervention' | 'emergency_services' | 'rapid_response' | 'urgent_intervention' | 'standard_response' | null
          requires_immediate?: boolean | null
          has_actionable_plan?: boolean | null
          is_passive_ideation?: boolean | null
          escalated_from?: string | null // UUID
          location_based?: boolean | null
          cultural_context?: string | null
          is_metaphorical?: boolean | null
          is_general_inquiry?: boolean | null
          last_crisis_assessment_at?: string | null // timestamptz
        }
        Update: {
          assignee?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          metadata?: Json | null
          priority?: string
          status?: string
          tags?: string[] | null
          title?: string
          updated_at?: string | null
          crisis_type?: 'suicide_risk' | 'self_harm' | 'panic_attack' | 'medical_emergency' | 'severe_distress' | 'emotional_distress' | 'cultural_distress' | 'general_stress' | 'mental_health' | null
          severity_level?: 'critical' | 'high' | 'medium' | 'low' | null
          response_protocol?: 'immediate_intervention' | 'emergency_services' | 'rapid_response' | 'urgent_intervention' | 'standard_response' | null
          requires_immediate?: boolean | null
          has_actionable_plan?: boolean | null
          is_passive_ideation?: boolean | null
          escalated_from?: string | null // UUID
          location_based?: boolean | null
          cultural_context?: string | null
          is_metaphorical?: boolean | null
          is_general_inquiry?: boolean | null
          last_crisis_assessment_at?: string | null // timestamptz
        }
        Relationships: [
          {
            foreignKeyName: "tickets_escalated_from_fkey"
            columns: ["escalated_from"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          }
        ]
      }
      users_secure: {
        Row: {
          created_at: string
          email: string
          id: string
          role: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          id: string
          role?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          role?: string | null
          updated_at?: string
        }
        Relationships: []
      }
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
          created_at: string | null
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
          created_at?: string | null
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
          created_at?: string | null
        }
        Relationships: []
      }
      ai_analyses: {
        Row: {
          id: string
          ticket_id: string
          type: 'sentiment' | 'priority' | 'category' | 'response' | 'urgency' | 'crisis'
          created_at: string
          result: {
            confidence: number
            explanation?: string
            
            crisis_type?: 'suicide_risk' | 'self_harm' | 'panic_attack' | 'medical_emergency' | 'severe_distress' | 'emotional_distress' | 'cultural_distress' | 'general_stress' | 'mental_health'
            severity_level?: 'critical' | 'high' | 'medium' | 'low'
            response_protocol?: 'immediate_intervention' | 'emergency_services' | 'rapid_response' | 'urgent_intervention' | 'standard_response'
            requires_immediate?: boolean
            has_actionable_plan?: boolean
            is_passive_ideation?: boolean
            location_based?: boolean
            cultural_context?: string
            is_metaphorical?: boolean
            is_general_inquiry?: boolean
          }
          confidence: number
          model_info: {
            name: string
            version: string
            [key: string]: any
          }
          feedback_score?: number
          feedback_notes?: string
          is_validated: boolean
          validated_at?: string
          validated_by?: string
          version: number
        }
        Insert: {
          id?: string
          ticket_id: string
          type: 'sentiment' | 'priority' | 'category' | 'response' | 'urgency' | 'crisis'
          created_at?: string
          result: Database['public']['Tables']['ai_analyses']['Row']['result']
          confidence: number
          model_info: {
            name: string
            version: string
            [key: string]: any
          }
          feedback_score?: number
          feedback_notes?: string
          is_validated?: boolean
          validated_at?: string
          validated_by?: string
          version?: number
        }
        Update: {
          id?: string
          ticket_id?: string
          type?: 'sentiment' | 'priority' | 'category' | 'response' | 'urgency' | 'crisis'
          created_at?: string
          result?: Database['public']['Tables']['ai_analyses']['Row']['result']
          confidence?: number
          model_info?: {
            name: string
            version: string
            [key: string]: any
          }
          feedback_score?: number
          feedback_notes?: string
          is_validated?: boolean
          validated_at?: string
          validated_by?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "fk_ai_analyses_ticket"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          }
        ]
      }
      message_queue: {
        Row: {
          id: string
          type: string
          initial_severity: string | null
          status: 'pending' | 'processing' | 'processed' | 'error'
          data: Json
          source: string
          context: Json | null
          user_id: string | null
          session_id: string | null
          created_at: string | null
          processed_at: string | null
          processing_metadata: Json | null
          error: string | null
          retry_count: number
        }
        Insert: {
          id?: string
          type: string
          initial_severity?: string | null
          status?: 'pending' | 'processing' | 'processed' | 'error'
          data: Json
          source: string
          context?: Json | null
          user_id?: string | null
          session_id?: string | null
          created_at?: string | null
          processed_at?: string | null
          processing_metadata?: Json | null
          error?: string | null
          retry_count?: number
        }
        Update: {
          id?: string
          type?: string
          initial_severity?: string | null
          status?: 'pending' | 'processing' | 'processed' | 'error'
          data?: Json
          source?: string
          context?: Json | null
          user_id?: string | null
          session_id?: string | null
          created_at?: string | null
          processed_at?: string | null
          processing_metadata?: Json | null
          error?: string | null
          retry_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "message_queue_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      monitoring_audit_log: {
        Row: {
          id: string
          event_type: string
          severity: string
          event_data: Json
          analysis_data: Json | null
          metadata: Json | null
          created_at: string | null
        }
        Insert: {
          id?: string
          event_type: string
          severity: string
          event_data: Json
          analysis_data?: Json | null
          metadata?: Json | null
          created_at?: string | null
        }
        Update: {
          id?: string
          event_type?: string
          severity?: string
          event_data?: Json
          analysis_data?: Json | null
          metadata?: Json | null
          created_at?: string | null
        }
        Relationships: []
      }
      critical_alerts: {
        Row: {
          id: string
          ticket_id: string
          severity: 'critical' | 'high' | 'medium' | 'low'
          requires_immediate: boolean
          crisis_type: 'suicide_risk' | 'self_harm' | 'panic_attack' | 'medical_emergency' | 'severe_distress' | 'emotional_distress' | 'cultural_distress' | 'general_stress' | 'mental_health' | null
          response_protocol: 'immediate_intervention' | 'emergency_services' | 'rapid_response' | 'urgent_intervention' | 'standard_response' | null
          confidence: number
          metadata: Json | null
          status: 'pending' | 'acknowledged' | 'resolved'
          acknowledged_by: string | null
          acknowledged_at: string | null
          resolved_by: string | null
          resolved_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          ticket_id: string
          severity: 'critical' | 'high' | 'medium' | 'low'
          requires_immediate: boolean
          crisis_type?: 'suicide_risk' | 'self_harm' | 'panic_attack' | 'medical_emergency' | 'severe_distress' | 'emotional_distress' | 'cultural_distress' | 'general_stress' | 'mental_health' | null
          response_protocol?: 'immediate_intervention' | 'emergency_services' | 'rapid_response' | 'urgent_intervention' | 'standard_response' | null
          confidence: number
          metadata?: Json | null
          status?: 'pending' | 'acknowledged' | 'resolved'
          acknowledged_by?: string | null
          acknowledged_at?: string | null
          resolved_by?: string | null
          resolved_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          ticket_id?: string
          severity?: 'critical' | 'high' | 'medium' | 'low'
          requires_immediate?: boolean
          crisis_type?: 'suicide_risk' | 'self_harm' | 'panic_attack' | 'medical_emergency' | 'severe_distress' | 'emotional_distress' | 'cultural_distress' | 'general_stress' | 'mental_health' | null
          response_protocol?: 'immediate_intervention' | 'emergency_services' | 'rapid_response' | 'urgent_intervention' | 'standard_response' | null
          confidence?: number
          metadata?: Json | null
          status?: 'pending' | 'acknowledged' | 'resolved'
          acknowledged_by?: string | null
          acknowledged_at?: string | null
          resolved_by?: string | null
          resolved_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "critical_alerts_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "critical_alerts_acknowledged_by_fkey"
            columns: ["acknowledged_by"]
            isOneToOne: false
            referencedRelation: "users_secure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "critical_alerts_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "users_secure"
            referencedColumns: ["id"]
          }
        ]
      }
      critical_alert_notifications: {
        Row: {
          id: string
          alert_id: string
          user_id: string
          status: 'unread' | 'read' | 'acknowledged'
          read_at: string | null
          acknowledged_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          alert_id: string
          user_id: string
          status?: 'unread' | 'read' | 'acknowledged'
          read_at?: string | null
          acknowledged_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          alert_id?: string
          user_id?: string
          status?: 'unread' | 'read' | 'acknowledged'
          read_at?: string | null
          acknowledged_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "critical_alert_notifications_alert_id_fkey"
            columns: ["alert_id"]
            isOneToOne: false
            referencedRelation: "critical_alerts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "critical_alert_notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_secure"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      update_ticket_with_activity: {
        Args: {
          p_ticket_id: string
          p_updates: Json
          p_actor_id: string
        }
        Returns: Json
      }
    }
    Enums: {
      crisis_type: 'suicide_risk' | 'self_harm' | 'panic_attack' | 'medical_emergency' | 'severe_distress' | 'emotional_distress' | 'cultural_distress' | 'general_stress' | 'mental_health'
      severity_level: 'critical' | 'high' | 'medium' | 'low'
      response_protocol: 'immediate_intervention' | 'emergency_services' | 'rapid_response' | 'urgent_intervention' | 'standard_response'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
    ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

