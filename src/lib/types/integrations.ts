// Webhook Types
export interface WebhookConfig {
  id: string
  name: string
  url: string
  events: WebhookEvent[]
  isActive: boolean
  secret: string
  createdAt: string
  updatedAt: string
  headers?: Record<string, string>
  retryConfig?: RetryConfig
}

export type WebhookEvent = 
  | 'ticket.created'
  | 'ticket.updated'
  | 'ticket.deleted'
  | 'ticket.assigned'
  | 'ticket.status_changed'
  | 'ticket.priority_changed'

interface RetryConfig {
  maxAttempts: number
  backoffRate: number
  initialDelay: number
}

// Analytics Types
export interface AnalyticsEvent {
  id: string
  type: AnalyticsEventType
  timestamp: string
  data: Record<string, any>
  userId?: string
  sessionId?: string
  metadata?: Record<string, any>
}

export type AnalyticsEventType = 
  | 'page_view'
  | 'ticket_action'
  | 'search'
  | 'filter'
  | 'bulk_action'
  | 'workflow_trigger'

// Workflow Types
export interface Workflow {
  id: string
  name: string
  description?: string
  trigger: WorkflowTrigger
  conditions: WorkflowCondition[]
  actions: WorkflowAction[]
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface WorkflowTrigger {
  type: 'event' | 'schedule' | 'condition'
  config: Record<string, any>
}

export interface WorkflowCondition {
  field: string
  operator: 'equals' | 'contains' | 'gt' | 'lt' | 'in' | 'exists'
  value: any
}

export interface WorkflowAction {
  type: WorkflowActionType
  config: Record<string, any>
}

export type WorkflowActionType =
  | 'update_ticket'
  | 'send_notification'
  | 'trigger_webhook'
  | 'run_ai_analysis'

// AI Integration Types
export interface AIConfig {
  id: string
  provider: 'openai' | 'anthropic' | 'cohere'
  model: string
  temperature?: number
  maxTokens?: number
  apiKey?: string
  options?: Record<string, any>
}

export interface AIAnalysis {
  id: string
  ticketId: string
  type: AIAnalysisType
  result: Record<string, any>
  confidence: number
  timestamp: string
  modelInfo: {
    provider: string
    model: string
    version?: string
  }
}

export type AIAnalysisType =
  | 'sentiment'
  | 'priority_suggestion'
  | 'category_detection'
  | 'response_suggestion'
  | 'urgency_detection' 