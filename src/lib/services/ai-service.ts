import { ChromaService, InsightPattern } from './integrations/chroma'
import { OpenAIService } from './integrations/openai'
import { AnalysisRequest, AIServiceConfig, TicketAnalysis, DetailedFeedback, AIMetrics } from '@/types/ai'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/lib/database.types'

const DEFAULT_CONFIG: AIServiceConfig = {
  maxTokens: 1000,
  temperature: 0.7,
  similarityThreshold: 0.7,
  maxPatterns: 5
}

export class AIService {
  private static instance: AIService | null = null
  private chromaService: ChromaService
  private openaiService: OpenAIService
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
    this.openaiService = OpenAIService.getInstance()
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
Related Tickets: ${p.relatedTickets.join(', ')}
      `).join('\n')

    return `
You are an expert support analyst. Using the context of similar tickets below,
analyze this new ticket and suggest a resolution approach.

Historical Context:
${context}

New Ticket:
${content}

Please provide a structured analysis with the following sections:

1. Problem Classification
- Categorize the issue type
- Identify key components involved
- Note any potential impact areas

2. Root Cause Analysis
- List potential underlying causes
- Identify any patterns from similar tickets
- Note environmental or system factors

3. Recommended Resolution Steps
- Provide clear, actionable steps
- Include verification steps
- Note any required permissions or resources

4. Additional Context Needed
- List any missing information
- Suggest clarifying questions
- Note any assumptions made

Please format your response in markdown for better readability.`
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
      
      // Generate analysis using OpenAI
      const { content: analysis, tokensUsed } = await this.openaiService.generateAnalysis(
        prompt,
        config
      )

      // Update metrics
      this.updateMetrics('success', Date.now() - startTime, patterns)

      return {
        patterns,
        analysis,
        confidence: patterns[0]?.confidence || 0,
        metadata: {
          processingTime: Date.now() - startTime,
          modelUsed: 'gpt-4',
          tokensUsed
        }
      }
    } catch (error) {
      console.error('Error analyzing ticket:', error)
      this.updateMetrics('error', Date.now() - startTime)
      throw error
    }
  }

  public async trackFeedback(feedback: DetailedFeedback): Promise<void> {
    const supabase = createClient()
    
    try {
      const { error } = await supabase
        .from('insight_feedback')
        .insert({
          pattern_id: feedback.patternId,
          helpful: feedback.helpful,
          accuracy: this.convertRatingToNumber(feedback.accuracy),
          relevance: this.convertRatingToNumber(feedback.relevance),
          actionability: feedback.actionability,
          comments: feedback.comments ?? null,
          user_id: feedback.userId ?? null,
          created_at: feedback.timestamp?.toISOString() || new Date().toISOString()
        })

      if (error) throw error

      // Update metrics
      this.updateFeedbackMetrics(feedback)
    } catch (error) {
      console.error('Error tracking feedback:', error)
      throw error
    }
  }

  private convertRatingToNumber(rating: 'high' | 'medium' | 'low' | 'neutral'): number {
    switch (rating) {
      case 'high':
        return 1
      case 'medium':
        return 0.66
      case 'low':
        return 0.33
      case 'neutral':
      default:
        return 0.5
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
    stats.accuracy = (stats.accuracy * (stats.total - 1) + this.convertRatingToNumber(feedback.accuracy)) / stats.total
  }

  public getMetrics(): AIMetrics {
    return { ...this.metrics }
  }
} 