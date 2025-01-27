import type { SupabaseClient } from '@supabase/supabase-js'
import type { AIConfig, AIAnalysis, AIAnalysisType } from '@/lib/types/integrations'
import type { Database } from '@/types/supabase'
import type { TicketPriority } from '@/lib/types'
import { ChromaService } from './chroma'

interface AIResponse<T> {
  result: T
  confidence?: number
  metadata?: Record<string, unknown>
}

interface SentimentResponse {
  sentiment: 'positive' | 'negative' | 'neutral'
  score: number
}

interface PriorityResponse {
  priority: TicketPriority
  reason: string
}

interface CategoryResponse {
  category: string
  subcategory?: string
}

interface ResponseSuggestion {
  content: string
  context?: Record<string, unknown>
}

interface UrgencyResponse {
  isUrgent: boolean
  reason: string
  suggestedPriority?: TicketPriority
}

interface RAGConfig {
  maxTokens: number
  relevanceThreshold: number
  maxResults: number
  summaryLength: number
}

interface RAGContext {
  relevantContent: string[]
  confidence: number
  metadata: {
    sources: string[]
    timestamp: string
  }
}

export class AIService {
  private static instance: AIService | null = null
  private config: AIConfig | null = null
  private chromaService: ChromaService
  private ragConfig: RAGConfig = {
    maxTokens: 1500,
    relevanceThreshold: 0.7,
    maxResults: 3,
    summaryLength: 250
  }

  private constructor(
    private readonly supabase: SupabaseClient<Database>
  ) {
    this.chromaService = ChromaService.getInstance()
  }

  public static getInstance(supabase: SupabaseClient<Database>): AIService {
    if (!AIService.instance) {
      AIService.instance = new AIService(supabase)
    }
    return AIService.instance
  }

  public static resetInstance(): void {
    AIService.instance = null
  }

  // Configuration Management
  async getConfig(): Promise<AIConfig> {
    if (this.config) return this.config

    const { data, error } = await this.supabase
      .from('ai_config')
      .select('*')
      .single()

    if (error) throw error
    this.config = data as AIConfig
    return this.config
  }

  async updateConfig(config: Partial<AIConfig>): Promise<AIConfig> {
    const { data, error } = await this.supabase
      .from('ai_config')
      .update(config)
      .eq('id', this.config?.id)
      .select()
      .single()

    if (error) throw error
    this.config = data as AIConfig
    return this.config
  }

  // Analysis Operations
  async analyzeTicket(
    ticketId: string, 
    type: AIAnalysisType,
    content: string
  ): Promise<AIAnalysis> {
    const config = await this.getConfig()
    
    const analyzeFunction = this.getAnalysisFunction(type)
    const result = await analyzeFunction(content, config)
    
    const analysis: Omit<AIAnalysis, 'id'> = {
      ticketId,
      type,
      result,
      confidence: result.confidence || 0,
      timestamp: new Date().toISOString(),
      modelInfo: {
        provider: config.provider,
        model: config.model,
        version: (config.options?.version as string) || undefined
      }
    }

    const { data, error } = await this.supabase
      .from('ai_analyses')
      .insert([analysis])
      .select()
      .single()

    if (error) throw error
    return data as AIAnalysis
  }

  private getAnalysisFunction(type: AIAnalysisType): (content: string, config: AIConfig) => Promise<AIResponse<unknown>> {
    switch (type) {
      case 'sentiment':
        return this.analyzeSentiment.bind(this)
      case 'priority_suggestion':
        return this.analyzePriority.bind(this)
      case 'category_detection':
        return this.analyzeCategory.bind(this)
      case 'response_suggestion':
        return this.suggestResponse.bind(this)
      case 'urgency_detection':
        return this.analyzeUrgency.bind(this)
      default:
        throw new Error(`Unsupported analysis type: ${type}`)
    }
  }

  // Individual Analysis Methods
  private async analyzeSentiment(content: string, config: AIConfig): Promise<AIResponse<SentimentResponse>> {
    const response = await this.callAI<SentimentResponse>(
      `Analyze sentiment: ${content}`, 
      config,
      content
    )
    return response
  }

  private async analyzePriority(content: string, config: AIConfig): Promise<AIResponse<PriorityResponse>> {
    const response = await this.callAI<PriorityResponse>(
      `Analyze priority: ${content}`,
      config,
      content
    )
    return response
  }

  private async analyzeCategory(content: string, config: AIConfig): Promise<AIResponse<CategoryResponse>> {
    const response = await this.callAI<CategoryResponse>(
      `Analyze category: ${content}`,
      config,
      content
    )
    return response
  }

  private async suggestResponse(content: string, config: AIConfig): Promise<AIResponse<ResponseSuggestion>> {
    const response = await this.callAI<ResponseSuggestion>(
      `Suggest response: ${content}`,
      config,
      content
    )
    return response
  }

  private async analyzeUrgency(content: string, config: AIConfig): Promise<AIResponse<UrgencyResponse>> {
    const response = await this.callAI<UrgencyResponse>(
      `Analyze urgency: ${content}`,
      config,
      content
    )
    return response
  }

  // AI Provider Integration
  private async callAI<T>(prompt: string, config: AIConfig, content?: string): Promise<AIResponse<T>> {
    const enhancedPrompt = content 
      ? await this.enhancePromptWithRAG(prompt, content)
      : prompt

    switch (config.provider) {
      case 'openai':
        return this.callOpenAI<T>(enhancedPrompt, config)
      case 'anthropic':
        return this.callAnthropic<T>(enhancedPrompt, config)
      case 'cohere':
        return this.callCohere<T>(enhancedPrompt, config)
      default:
        throw new Error(`Unsupported AI provider: ${config.provider}`)
    }
  }

  private async callOpenAI<T>(_prompt: string, _config: AIConfig): Promise<AIResponse<T>> {
    // Implementation
    throw new Error('Not implemented')
  }

  private async callAnthropic<T>(_prompt: string, _config: AIConfig): Promise<AIResponse<T>> {
    // Implementation
    throw new Error('Not implemented')
  }

  private async callCohere<T>(_prompt: string, _config: AIConfig): Promise<AIResponse<T>> {
    // Implementation
    throw new Error('Not implemented')
  }

  async analyze(type: AIAnalysisType, content: string, config: AIConfig): Promise<AIResponse<unknown>> {
    const analysisFunction = this.getAnalysisFunction(type) as (content: string, config: AIConfig) => Promise<AIResponse<unknown>>
    return analysisFunction(content, config)
  }

  async generateSummary(prompt: string, config?: AIConfig): Promise<string> {
    const aiConfig = config || await this.getConfig()
    const response = await this.callAI<{ summary: string }>(
      `Generate summary: ${prompt}`,
      aiConfig
    )
    return response.result.summary
  }

  async generateTags(prompt: string, config?: AIConfig): Promise<string[]> {
    const aiConfig = config || await this.getConfig()
    const response = await this.callAI<{ tags: string[] }>(
      `Generate tags: ${prompt}`,
      aiConfig
    )
    return response.result.tags
  }

  async generateTitle(prompt: string, config?: AIConfig): Promise<string> {
    const aiConfig = config || await this.getConfig()
    const response = await this.callAI<{ title: string }>(
      `Generate title: ${prompt}`,
      aiConfig
    )
    return response.result.title
  }

  private async getRAGContext(content: string): Promise<RAGContext> {
    try {
      // Generate a temporary ID for the search
      const searchId = `search_${Date.now()}`
      
      // Index the search content temporarily
      await this.chromaService.indexTicket(searchId, content)
      
      // Find similar patterns
      const patterns = await this.chromaService.findPatterns(searchId)
      
      // Filter and process relevant content
      const relevantContent = patterns
        .filter(p => p.confidence > this.ragConfig.relevanceThreshold)
        .map(p => p.explanation)
        .slice(0, this.ragConfig.maxResults)

      // Calculate average confidence
      const avgConfidence = patterns.reduce((acc, p) => acc + p.confidence, 0) / patterns.length

      return {
        relevantContent,
        confidence: avgConfidence,
        metadata: {
          sources: patterns.map(p => p.relatedTickets).flat(),
          timestamp: new Date().toISOString()
        }
      }
    } catch (error) {
      console.error('Failed to get RAG context:', error)
      return {
        relevantContent: [],
        confidence: 0,
        metadata: {
          sources: [],
          timestamp: new Date().toISOString()
        }
      }
    }
  }

  private async enhancePromptWithRAG(prompt: string, content: string): Promise<string> {
    const context = await this.getRAGContext(content)
    
    if (context.relevantContent.length === 0) {
      return prompt
    }

    return `
Given this historical context:
${context.relevantContent.join('\n\n')}

Confidence: ${context.confidence.toFixed(2)}

Original prompt:
${prompt}

Please provide a response that incorporates the historical context where relevant.
`
  }
}