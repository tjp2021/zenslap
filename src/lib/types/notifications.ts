import { Database } from '@/lib/database.types'

export type Notification = Database['public']['Tables']['notifications']['Row']

export type NotificationType = 'standard' | 'critical_alert'

export interface NotificationMetadata {
  reasoning: string
  suggestedActions?: string[]
  relatedPatterns?: string[]
  modelInfo: {
    provider: string
    model: string
    version?: string
  }
}

export interface NotificationWithDetails extends Notification {
  type?: NotificationType
  priority?: 'high' | 'medium' | 'low'
  confidence?: number
  ai_metadata?: NotificationMetadata
  activity: {
    id: string
    ticket_id: string
    activity_type: string
    content: any
    created_at: string
    ticket: {
      id: string
      title: string
    }
  }
}

export interface CriticalAlertNotification extends NotificationWithDetails {
  type: 'critical_alert'
  alert: {
    id: string
    severity: 'critical' | 'high' | 'medium' | 'low'
    crisis_type: 'suicide_risk' | 'self_harm' | 'panic_attack' | 'medical_emergency' | 'severe_distress' | 'emotional_distress' | 'cultural_distress' | 'general_stress' | 'mental_health'
    requires_immediate: boolean
    response_protocol: 'immediate_intervention' | 'emergency_services' | 'rapid_response' | 'urgent_intervention' | 'standard_response'
    status: 'pending' | 'acknowledged' | 'resolved'
    metadata?: {
      location?: string
      cultural_context?: string
      risk_factors?: string[]
      previous_incidents?: number
    }
  }
} 