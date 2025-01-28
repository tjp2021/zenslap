import { InsightPattern } from '../lib/services/integrations/chroma'

export interface TicketAnalysis {
  patterns: InsightPattern[]
  analysis: string
  confidence: number
  metadata?: {
    processingTime: number
    modelUsed: string
    tokensUsed?: number
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