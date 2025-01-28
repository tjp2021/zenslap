import { InsightPattern } from '../lib/services/integrations/chroma'

export type CrisisType = 
  | 'suicide_risk'
  | 'self_harm'
  | 'panic_attack'
  | 'medical_emergency'
  | 'severe_distress'
  | 'emotional_distress'
  | 'cultural_distress'
  | 'general_stress'
  | 'mental_health'

export type Severity = 'critical' | 'high' | 'medium' | 'low'

export type ResponseProtocol = 
  | 'immediate_intervention'
  | 'emergency_services'
  | 'rapid_response'
  | 'urgent_intervention'
  | 'standard_response'

export interface CrisisMetadata {
  severity: Severity
  requiresImmediate: boolean
  crisisType?: CrisisType
  responseProtocol?: ResponseProtocol
  hasActionablePlan?: boolean
  isPassiveIdeation?: boolean
  escalatedFrom?: string
  auditLog?: string[]
  locationBased?: boolean
  cultural_context?: string
  indirect_expression?: boolean
  isMetaphorical?: boolean
  isGeneralInquiry?: boolean
}

export interface TicketAnalysis {
  patterns: InsightPattern[]
  analysis: string
  confidence: number
  metadata?: {
    processingTime: number
    modelUsed: string
    tokensUsed?: number
    severity?: Severity
    requiresImmediate?: boolean
    responseProtocol?: ResponseProtocol
    auditLog?: string[]
    locationBased?: boolean
    crisisType?: CrisisType
    hasActionablePlan?: boolean
    isPassiveIdeation?: boolean
    culturalContext?: string
    isMetaphorical?: boolean
    isGeneralInquiry?: boolean
    reasoning?: string
  }
}

export interface AIServiceConfig {
  maxTokens?: number
  temperature?: number
  similarityThreshold?: number
  maxPatterns?: number
}

export interface AnalysisRequest {
  ticketId: string
  content: string
  metadata?: Record<string, any>
  config?: Partial<AIServiceConfig>
}

export interface DetailedFeedback {
  patternId: string
  helpful: boolean
  accuracy: 'high' | 'medium' | 'low' | 'neutral'
  relevance: 'high' | 'medium' | 'low' | 'neutral'
  actionability: 'high' | 'medium' | 'low' | 'neutral'
  comments?: string | null
  userId?: string | null
  timestamp?: Date
}

export interface AIMetrics {
  requestCount: number
  averageLatency: number
  successRate: number
  patternDistribution: Record<string, number>
  feedbackStats: {
    total: number
    helpful: number
    accuracy: number
  }
} 