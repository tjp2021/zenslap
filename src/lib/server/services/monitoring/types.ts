import { Database } from '@/lib/database.types'

export type Severity = 'critical' | 'high' | 'medium' | 'low'
export type EventType = 'message' | 'activity' | 'crisis' | 'system'

export interface MonitoringEvent {
  type: EventType
  severity: Severity
  data: Record<string, any>
  metadata: {
    timestamp: Date
    source: string
    context?: Record<string, any>
    userId?: string
    sessionId?: string
  }
}

export interface EventAnalysis {
  severity: Severity
  confidence: number
  reasoning: string
  suggestedActions: string[]
  metadata: {
    patterns?: string[]
    relatedEvents?: string[]
    modelInfo: {
      provider: string
      model: string
      version?: string
    }
  }
}

export interface MonitoringMetrics {
  processedCount: number
  errorCount: number
  criticalCount: number
  averageProcessingTime: number
  lastProcessedAt?: Date
  batchSize: number
}

export interface MonitoringConfig {
  pollIntervalMs: number
  maxBatchSize: number
  maxProcessingTimeMs: number
  errorThreshold: number
  retryAttempts: number
  criticalEventWebhook?: string
}

// Database types
export type QueueEntry = Database['public']['Tables']['message_queue']['Row']
export type NotificationEntry = Database['public']['Tables']['notifications']['Row']
export type AuditLogEntry = Database['public']['Tables']['monitoring_audit_log']['Row'] 