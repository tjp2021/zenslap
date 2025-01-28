import { ChromaService, InsightPattern } from './integrations/chroma'
import { OpenAIService } from './integrations/openai'
import { AnalysisRequest, AIServiceConfig, TicketAnalysis, DetailedFeedback, AIMetrics, Severity } from '../../types/ai'
import { createClient } from '../supabase/client'
import type { Database } from '../database.types'

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

  private async generateRAGPrompt(
    patterns: InsightPattern[], 
    content: string, 
    type: 'crisis' | 'general' = 'general'
  ): Promise<string> {
    const context = patterns
      .filter(p => p.confidence >= (DEFAULT_CONFIG.similarityThreshold || 0.7))
      .map(p => `
Similar Ticket:
${p.explanation}
Confidence: ${p.confidence}
Related Tickets: ${p.relatedTickets.join(', ')}
      `).join('\n')

    if (type === 'crisis') {
      return `
You are an expert mental health support analyst trained to detect crisis signals in support tickets. Using the historical context of similar tickets below, analyze this content for potential crisis signals.

Historical Context:
${context}

Content to analyze:
${content}

Provide a structured analysis in JSON format with the following schema:
{
  "crisis_type": "suicide_risk" | "self_harm" | "panic_attack" | "medical_emergency" | "severe_distress" | "emotional_distress" | "cultural_distress" | "general_stress" | "mental_health",
  "severity_level": "critical" | "high" | "medium" | "low",
  "response_protocol": "immediate_intervention" | "emergency_services" | "rapid_response" | "urgent_intervention" | "standard_response",
  "requires_immediate": boolean,
  "has_actionable_plan": boolean,
  "is_passive_ideation": boolean,
  "location_based": boolean,
  "cultural_context": string | null,
  "is_metaphorical": boolean,
  "is_general_inquiry": boolean,
  "explanation": string,
  "confidence": number,
  "reasoning": string
}

Important guidelines:
1. Be conservative in crisis assessment - if in doubt, err on the side of caution
2. Set requires_immediate to true for any critical or high severity cases
3. Provide clear reasoning for your assessment
4. Consider cultural and contextual factors
5. Distinguish between metaphorical and literal expressions
6. Note if location information is present
7. Assess if there's an actionable plan (for crisis situations)
8. Consider if this is a general inquiry about mental health vs active crisis`
    }

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

  public async analyzeCrisis(ticketId: string, content: string): Promise<TicketAnalysis> {
    return this.analyzeTicket({
      ticketId,
      content,
      config: {
        temperature: 0.3, // Lower temperature for more consistent crisis detection
        maxTokens: 500,   // Shorter response needed for crisis assessment
      },
      metadata: {
        analysisType: 'crisis',
        version: '1.0'
      }
    }, 'crisis')
  }

  public async analyzeTicket(
    request: AnalysisRequest, 
    type: 'crisis' | 'general' = 'general'
  ): Promise<TicketAnalysis> {
    const startTime = Date.now()
    const config = { ...DEFAULT_CONFIG, ...request.config }
    
    try {
      // Index the new ticket
      await this.chromaService.indexTicket(request.ticketId, request.content)

      // Find similar patterns
      const patterns = await this.chromaService.findPatterns(request.ticketId)

      // Generate analysis using RAG
      const prompt = await this.generateRAGPrompt(patterns, request.content, type)
      
      // Generate analysis using OpenAI
      const { content: analysis, tokensUsed } = await this.openaiService.generateAnalysis(
        prompt,
        config
      )

      // Parse analysis if it's a crisis assessment
      let parsedAnalysis = analysis
      let crisisMetadata = {}
      
      if (type === 'crisis') {
        try {
          const crisisResult = JSON.parse(analysis)
          parsedAnalysis = crisisResult.explanation
          crisisMetadata = {
            crisisType: crisisResult.crisisType,
            severity: crisisResult.severityLevel,
            responseProtocol: crisisResult.responseProtocol,
            requiresImmediate: crisisResult.requiresImmediate,
            hasActionablePlan: crisisResult.hasActionablePlan,
            isPassiveIdeation: crisisResult.isPassiveIdeation,
            locationBased: crisisResult.locationBased,
            culturalContext: crisisResult.culturalContext,
            isMetaphorical: crisisResult.isMetaphorical,
            isGeneralInquiry: crisisResult.isGeneralInquiry,
            confidence: crisisResult.confidence,
            reasoning: crisisResult.reasoning
          }
        } catch (error) {
          console.error('Error parsing crisis analysis:', error)
          throw new Error('Failed to parse crisis analysis result')
        }
      }

      const elapsedTime = Date.now() - startTime

      // Update metrics
      this.updateMetrics('success', elapsedTime, patterns)

      // Get the highest severity pattern for crisis metadata
      const criticalPattern = patterns.reduce((highest, current) => {
        const currentSeverity = ((current.metadata as any)?.severity || 'low') as Severity
        const highestSeverity = ((highest?.metadata as any)?.severity || 'low') as Severity
        const severityOrder: Record<Severity, number> = { critical: 3, high: 2, medium: 1, low: 0 }
        return severityOrder[currentSeverity] > severityOrder[highestSeverity] ? current : highest
      }, patterns[0])

      // Combine metadata from request and patterns
      const combinedMetadata: TicketAnalysis['metadata'] = {
        processingTime: elapsedTime,
        modelUsed: 'gpt-4',
        tokensUsed,
        severity: type === 'crisis' ? (crisisMetadata as any).severity : (criticalPattern?.metadata as any)?.severity || 'low',
        ...(criticalPattern?.metadata || {}),
        ...request.metadata,
        ...crisisMetadata,
        // Ensure arrays are properly merged
        auditLog: [
          ...((criticalPattern?.metadata as any)?.auditLog || []),
          ...((request.metadata as any)?.auditLog || [])
        ]
      }

      return {
        patterns,
        analysis: parsedAnalysis,
        confidence: type === 'crisis' ? (crisisMetadata as any).confidence : (patterns[0]?.confidence || 0),
        metadata: combinedMetadata
      }
    } catch (error) {
      console.error('Error analyzing ticket:', error)
      const elapsedTime = Date.now() - startTime
      this.updateMetrics('error', elapsedTime)
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