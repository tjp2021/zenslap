import { ChromaService, InsightPattern } from './integrations/chroma'
import { AnalysisRequest, AIServiceConfig, TicketAnalysis, DetailedFeedback, AIMetrics } from '@/types/ai'
import { createClient } from '@/lib/supabase/client'
import { Database } from '@/types/database'

const DEFAULT_CONFIG: AIServiceConfig = {
  maxTokens: 1000,
  temperature: 0.7,
  similarityThreshold: 0.7,
  maxPatterns: 5
}

export class AIService {
  private static instance: AIService | null = null
  private chromaService: ChromaService
  private metrics: AIMetrics = {
    requestCount: 0,
    averageLatency: 0,
    successRate: 0,
    patternDistribution: {},
    feedbackStats: {
      total: 0,
      helpful: 0,
      accuracy: 0
    }
  }

  private constructor() {
    this.chromaService = ChromaService.getInstance()
  }

  public static getInstance(): AIService {
    if (!AIService.instance) {
      AIService.instance = new AIService()
    }
    return AIService.instance
  }

  private async generateRAGPrompt(patterns: InsightPattern[], content: string): Promise<string> {
    const context = patterns
      .filter(p => p.confidence >= (DEFAULT_CONFIG.similarityThreshold || 0.7))
      .map(p => `
Similar Ticket:
${p.explanation}
Confidence: ${p.confidence}
      `).join('\n')

    return `
You are an expert support analyst. Using the context of similar tickets below,
analyze this new ticket and suggest a resolution approach.

Historical Context:
${context}

New Ticket:
${content}

Please provide:
1. Problem classification
2. Potential root causes
3. Recommended resolution steps
4. Additional context needed (if any)
`
  }

  public async analyzeTicket(request: AnalysisRequest): Promise<TicketAnalysis> {
    const startTime = Date.now()
    const config = { ...DEFAULT_CONFIG, ...request.config }
    
    try {
      // Index the new ticket
      await this.chromaService.indexTicket(request.ticketId, request.content)

      // Find similar patterns
      const patterns = await this.chromaService.findPatterns(request.ticketId)

      // Generate analysis using RAG
      const prompt = await this.generateRAGPrompt(patterns, request.content)
      
      // TODO: Replace with actual LLM call
      const analysis = 'Analysis will be implemented with actual LLM integration'

      // Update metrics
      this.updateMetrics('success', Date.now() - startTime, patterns)

      return {
        patterns,
        analysis,
        confidence: patterns[0]?.confidence || 0,
        metadata: {
          processingTime: Date.now() - startTime,
          modelUsed: 'gpt-4', // TODO: Make configurable
          tokensUsed: 0 // TODO: Add actual token counting
        }
      }
    } catch (error) {
      console.error('Error analyzing ticket:', error)
      this.updateMetrics('error', Date.now() - startTime)
      throw error
    }
  }

  public async trackFeedback(feedback: DetailedFeedback): Promise<void> {
    try {
      const supabase = createClient()
      
      // Store feedback in Supabase
      await supabase
        .from('insight_feedback')
        .insert({
          pattern_id: feedback.patternId,
          helpful: feedback.helpful,
          accuracy: feedback.accuracy,
          relevance: feedback.relevance,
          actionability: feedback.actionability,
          comments: feedback.comments,
          user_id: feedback.userId,
          created_at: feedback.timestamp || new Date()
        })

      // Update ChromaService accuracy tracking
      await this.chromaService.trackAccuracy(feedback.patternId, feedback.helpful)

      // Update local metrics
      this.updateFeedbackMetrics(feedback)
    } catch (error) {
      console.error('Error tracking feedback:', error)
      throw error
    }
  }

  private updateMetrics(
    status: 'success' | 'error',
    latency: number,
    patterns?: InsightPattern[]
  ): void {
    this.metrics.requestCount++
    this.metrics.averageLatency = (
      (this.metrics.averageLatency * (this.metrics.requestCount - 1) + latency) /
      this.metrics.requestCount
    )
    this.metrics.successRate = (
      (this.metrics.successRate * (this.metrics.requestCount - 1) +
        (status === 'success' ? 1 : 0)) /
      this.metrics.requestCount
    )

    if (patterns) {
      patterns.forEach(p => {
        this.metrics.patternDistribution[p.type] =
          (this.metrics.patternDistribution[p.type] || 0) + 1
      })
    }
  }

  private updateFeedbackMetrics(feedback: DetailedFeedback): void {
    const stats = this.metrics.feedbackStats
    stats.total++
    stats.helpful += feedback.helpful ? 1 : 0
    stats.accuracy = (stats.accuracy * (stats.total - 1) + feedback.accuracy) / stats.total
  }

  public getMetrics(): AIMetrics {
    return { ...this.metrics }
  }
} 