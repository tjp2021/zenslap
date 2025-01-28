import { CrisisType, Severity, ResponseProtocol } from '../../../types/ai'

export interface SupportTicket {
  id: string
  content: string
  createdAt: Date
  updatedAt: Date
  status: TicketStatus
  priority: TicketPriority
  category: TicketCategory
  assignedTo?: string
  metadata: TicketMetadata
}

export type TicketStatus = 
  | 'open'
  | 'in_progress'
  | 'pending'
  | 'resolved'
  | 'closed'
  | 'escalated'

export type TicketPriority = 
  | 'critical'
  | 'high'
  | 'medium'
  | 'low'

export type TicketCategory =
  | 'crisis'
  | 'technical'
  | 'billing'
  | 'feature_request'
  | 'general'

export interface TicketMetadata {
  crisisType?: CrisisType
  severity?: Severity
  responseProtocol?: ResponseProtocol
  requiresImmediate?: boolean
  escalatedFrom?: string
  auditLog?: string[]
  locationBased?: boolean
  cultural_context?: string
  indirect_expression?: boolean
  isMetaphorical?: boolean
  isGeneralInquiry?: boolean
  lastAnalyzedAt?: Date
  analysisVersion?: string
}

export interface EscalationRule {
  condition: (ticket: SupportTicket) => boolean
  action: (ticket: SupportTicket) => Promise<void>
  priority: number
}

export interface NotificationConfig {
  type: 'email' | 'sms' | 'in_app'
  recipient: string
  template: string
  priority: TicketPriority
  immediate: boolean
}

export interface AuditLogEntry {
  timestamp: Date
  action: string
  ticketId: string
  userId?: string
  metadata?: Record<string, any>
} 