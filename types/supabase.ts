export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      ai_config: {
        Row: {
          id: string
          provider: string
          model: string
          apiKey: string
          options?: Json
          created_at?: string
          updated_at?: string
        }
        Insert: {
          id?: string
          provider: string
          model: string
          apiKey: string
          options?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          provider?: string
          model?: string
          apiKey?: string
          options?: Json
          updated_at?: string
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
          modelInfo: Json
        }
        Insert: {
          id?: string
          ticketId: string
          type: string
          result: Json
          confidence: number
          timestamp: string
          modelInfo: Json
        }
        Update: {
          id?: string
          ticketId?: string
          type?: string
          result?: Json
          confidence?: number
          timestamp?: string
          modelInfo?: Json
        }
      }
      debug_log: {
        Row: {
          created_at: string | null
          id: number
          message: string | null
        }
        Insert: {
          created_at?: string | null
          id?: number
          message?: string | null
        }
        Update: {
          created_at?: string | null
          id?: number
          message?: string | null
        }
        Relationships: []
      }
      internal_notes: {
        Row: {
          content: string
          created_at: string
          created_by: string
          id: string
          mentions: string[] | null
          ticket_id: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          created_by: string
          id?: string
          mentions?: string[] | null
          ticket_id: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string
          id?: string
          mentions?: string[] | null
          ticket_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_ticket"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "sla_monitoring"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_ticket"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "internal_notes_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "sla_monitoring"
            referencedColumns: ["id"]
          },
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
        Relationships: [
          {
            foreignKeyName: "notif_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "ticket_activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notif_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_secure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "ticket_activities"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          email: string | null
          id: string
          role: string | null
        }
        Insert: {
          email?: string | null
          id: string
          role?: string | null
        }
        Update: {
          email?: string | null
          id?: string
          role?: string | null
        }
        Relationships: []
      }
      quick_responses: {
        Row: {
          category_id: string
          content: string
          created_at: string
          created_by: string
          id: string
          title: string
          updated_at: string
          variables: Json
        }
        Insert: {
          category_id: string
          content: string
          created_at?: string
          created_by: string
          id?: string
          title: string
          updated_at?: string
          variables?: Json
        }
        Update: {
          category_id?: string
          content?: string
          created_at?: string
          created_by?: string
          id?: string
          title?: string
          updated_at?: string
          variables?: Json
        }
        Relationships: [
          {
            foreignKeyName: "quick_responses_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "response_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      response_categories: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      sla_policies: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          priority: Database["public"]["Enums"]["sla_priority"]
          resolution_time_hours: number
          response_time_hours: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          priority: Database["public"]["Enums"]["sla_priority"]
          resolution_time_hours: number
          response_time_hours: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          priority?: Database["public"]["Enums"]["sla_priority"]
          resolution_time_hours?: number
          response_time_hours?: number
          updated_at?: string
        }
        Relationships: []
      }
      tags: {
        Row: {
          color: string | null
          created_at: string
          id: string
          name: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          color?: string | null
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      ticket_activities: {
        Row: {
          activity_type: string
          actor_id: string
          content: Json
          created_at: string
          id: string
          mentioned_user_ids: string[] | null
          ticket_id: string
        }
        Insert: {
          activity_type: string
          actor_id: string
          content: Json
          created_at?: string
          id?: string
          mentioned_user_ids?: string[] | null
          ticket_id: string
        }
        Update: {
          activity_type?: string
          actor_id?: string
          content?: Json
          created_at?: string
          id?: string
          mentioned_user_ids?: string[] | null
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ta_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "users_secure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_activities_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "sla_monitoring"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_activities_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_history: {
        Row: {
          created_at: string
          created_by: string | null
          field: string
          id: string
          new_value: string | null
          old_value: string | null
          ticket_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          field: string
          id?: string
          new_value?: string | null
          old_value?: string | null
          ticket_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          field?: string
          id?: string
          new_value?: string | null
          old_value?: string | null
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_history_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "sla_monitoring"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_history_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_messages: {
        Row: {
          content: string
          created_at: string
          created_by: string
          id: string
          ticket_id: string
          type: string
        }
        Insert: {
          content: string
          created_at?: string
          created_by: string
          id?: string
          ticket_id: string
          type: string
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string
          id?: string
          ticket_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_ticket"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "sla_monitoring"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_ticket"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "sla_monitoring"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_tags: {
        Row: {
          created_at: string
          tag_id: string
          ticket_id: string
        }
        Insert: {
          created_at?: string
          tag_id: string
          ticket_id: string
        }
        Update: {
          created_at?: string
          tag_id?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_tags_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "sla_monitoring"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_tags_ticket_id_fkey"
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
          created_at: string
          created_by: string
          description: string
          first_response_at: string | null
          id: string
          metadata: Json
          priority: string
          resolution_at: string | null
          sla_resolution_deadline: string | null
          sla_resolution_status:
            | Database["public"]["Enums"]["sla_status"]
            | null
          sla_response_deadline: string | null
          sla_response_status: Database["public"]["Enums"]["sla_status"] | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          assignee?: string | null
          created_at?: string
          created_by: string
          description: string
          first_response_at?: string | null
          id?: string
          metadata?: Json
          priority?: string
          resolution_at?: string | null
          sla_resolution_deadline?: string | null
          sla_resolution_status?:
            | Database["public"]["Enums"]["sla_status"]
            | null
          sla_response_deadline?: string | null
          sla_response_status?: Database["public"]["Enums"]["sla_status"] | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          assignee?: string | null
          created_at?: string
          created_by?: string
          description?: string
          first_response_at?: string | null
          id?: string
          metadata?: Json
          priority?: string
          resolution_at?: string | null
          sla_resolution_deadline?: string | null
          sla_resolution_status?:
            | Database["public"]["Enums"]["sla_status"]
            | null
          sla_response_deadline?: string | null
          sla_response_status?: Database["public"]["Enums"]["sla_status"] | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
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
    }
    Views: {
      sla_monitoring: {
        Row: {
          created_at: string | null
          first_response_at: string | null
          id: string | null
          is_breaching_sla: boolean | null
          priority: string | null
          resolution_at: string | null
          sla_resolution_deadline: string | null
          sla_resolution_status:
            | Database["public"]["Enums"]["sla_status"]
            | null
          sla_response_deadline: string | null
          sla_response_status: Database["public"]["Enums"]["sla_status"] | null
          status: string | null
          title: string | null
        }
        Insert: {
          created_at?: string | null
          first_response_at?: string | null
          id?: string | null
          is_breaching_sla?: never
          priority?: string | null
          resolution_at?: string | null
          sla_resolution_deadline?: string | null
          sla_resolution_status?:
            | Database["public"]["Enums"]["sla_status"]
            | null
          sla_response_deadline?: string | null
          sla_response_status?: Database["public"]["Enums"]["sla_status"] | null
          status?: string | null
          title?: string | null
        }
        Update: {
          created_at?: string | null
          first_response_at?: string | null
          id?: string | null
          is_breaching_sla?: never
          priority?: string | null
          resolution_at?: string | null
          sla_resolution_deadline?: string | null
          sla_resolution_status?:
            | Database["public"]["Enums"]["sla_status"]
            | null
          sla_response_deadline?: string | null
          sla_response_status?: Database["public"]["Enums"]["sla_status"] | null
          status?: string | null
          title?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      mark_notifications_as_read: {
        Args: {
          user_id: string
          notification_ids: string[]
        }
        Returns: undefined
      }
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
      sla_priority: "low" | "medium" | "high"
      sla_status: "pending" | "breached" | "met"
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
