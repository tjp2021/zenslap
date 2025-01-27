import type { SupabaseClient } from '@supabase/supabase-js'
import type { AIConfig, AIAnalysis, AIAnalysisType } from '@/lib/types/integrations'
import type { Database } from '@/../types/supabase'
import type { TicketPriority } from '@/lib/types'
import { ChromaService } from './chroma'
import OpenAI from 'openai'
import { backOff } from 'exponential-backoff'

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

interface OpenAIError {
  error: {
    message: string
    type: string
    code: string
  }
}

interface PromptTemplate {
  system: string
  format: string
}

interface AIServiceConfig {
  provider: string
  model: string
  maxTokens: number
  temperature: number
  relevanceThreshold: number
  maxResults: number
  summaryLength: number
}

interface RetryConfig {
  maxAttempts: number
  initialDelayMs: number
  maxDelayMs: number
}

export class AIService {
  private static instance: AIService | null = null
  private config: AIConfig | null = null
  private chromaService: ChromaService
  private openai: OpenAI | null = null
  
  private serviceConfig: AIServiceConfig = {
    provider: process.env.AI_PROVIDER || 'openai',
    model: process.env.AI_MODEL || 'gpt-4-turbo-preview',
    maxTokens: parseInt(process.env.AI_MAX_TOKENS || '1500'),
    temperature: parseFloat(process.env.AI_TEMPERATURE || '0.3'),
    relevanceThreshold: 0.7,
    maxResults: 3,
    summaryLength: 250
  }

  private retryConfig: RetryConfig = {
    maxAttempts: parseInt(process.env.RETRY_MAX_ATTEMPTS || '3'),
    initialDelayMs: parseInt(process.env.RETRY_INITIAL_DELAY || '1000'),
    maxDelayMs: parseInt(process.env.RETRY_MAX_DELAY || '10000')
  }

  private promptTemplates: Record<AIAnalysisType, PromptTemplate> = {
    sentiment: {
      system: 'You are an expert at sentiment analysis. Analyze the emotional tone and sentiment of support tickets.',
      format: `Analyze the sentiment of this support ticket. Return a JSON object with:
- sentiment: "positive", "negative", or "neutral"
- score: number between 0 and 1 indicating confidence
Example: { "sentiment": "positive", "score": 0.85 }`
    },
    priority_suggestion: {
      system: 'You are an expert at prioritizing support tickets based on urgency, impact, and business value.',
      format: `Analyze the priority of this support ticket. Return a JSON object with:
- priority: "high", "medium", or "low"
- reason: brief explanation of the priority assignment
Example: { "priority": "high", "reason": "Customer-facing production issue affecting multiple users" }`
    },
    category_detection: {
      system: 'You are an expert at categorizing support tickets into relevant technical and business domains.',
      format: `Categorize this support ticket. Return a JSON object with:
- category: main category (e.g., "authentication", "performance", "billing")
- subcategory: optional specific subcategory
Example: { "category": "authentication", "subcategory": "oauth" }`
    },
    response_suggestion: {
      system: 'You are an expert support agent providing helpful, accurate, and empathetic responses.',
      format: `Suggest a response for this support ticket. Return a JSON object with:
- content: the suggested response text
- context: optional object with relevant information used
Example: { "content": "I understand you're having trouble with login...", "context": { "issue": "oauth error" } }`
    },
    urgency_detection: {
      system: 'You are an expert at detecting urgent issues that require immediate attention.',
      format: `Analyze the urgency of this support ticket. Return a JSON object with:
- isUrgent: boolean indicating if immediate attention is needed
- reason: explanation of the urgency assessment
- suggestedPriority: optional priority level recommendation
Example: { "isUrgent": true, "reason": "Production system down", "suggestedPriority": "high" }`
    }
  }

  private constructor(
    private readonly supabase: SupabaseClient<Database>
  ) {
    this.chromaService = ChromaService.getInstance()
    this.validateConfig()
  }

  private validateConfig() {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY environment variable is not set')
    }
    
    if (this.serviceConfig.maxTokens < 1 || this.serviceConfig.maxTokens > 4000) {
      throw new Error('AI_MAX_TOKENS must be between 1 and 4000')
    }
    
    if (this.serviceConfig.temperature < 0 || this.serviceConfig.temperature > 2) {
      throw new Error('AI_TEMPERATURE must be between 0 and 2')
    }
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

    try {
      const { data, error } = await this.supabase
        .from('ai_config')
        .select('*')
        .single()

      if (error) throw error
      this.config = data as AIConfig
      return this.config
    } catch (error) {
      // If table doesn't exist, use environment variables
      console.log('Using environment variables for AI config')
      const config: AIConfig = {
        id: 'default',
        provider: 'openai',
        model: this.serviceConfig.model,
        apiKey: process.env.OPENAI_API_KEY!,
        options: {
          maxTokens: this.serviceConfig.maxTokens,
          temperature: this.serviceConfig.temperature
        }
      }
      this.config = config
      return config
    }
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
    return this.callOpenAI<SentimentResponse>(content, config, 'sentiment')
  }

  private async analyzePriority(content: string, config: AIConfig): Promise<AIResponse<PriorityResponse>> {
    return this.callOpenAI<PriorityResponse>(content, config, 'priority_suggestion')
  }

  private async analyzeCategory(content: string, config: AIConfig): Promise<AIResponse<CategoryResponse>> {
    return this.callOpenAI<CategoryResponse>(content, config, 'category_detection')
  }

  private async suggestResponse(content: string, config: AIConfig): Promise<AIResponse<ResponseSuggestion>> {
    return this.callOpenAI<ResponseSuggestion>(content, config, 'response_suggestion')
  }

  private async analyzeUrgency(content: string, config: AIConfig): Promise<AIResponse<UrgencyResponse>> {
    return this.callOpenAI<UrgencyResponse>(content, config, 'urgency_detection')
  }

  // AI Provider Integration
  private async callAI<T>(prompt: string, config: AIConfig, type: AIAnalysisType): Promise<AIResponse<T>> {
    const enhancedPrompt = await this.enhancePromptWithRAG(prompt, type)

    switch (config.provider) {
      case 'openai':
        return this.callOpenAI<T>(enhancedPrompt, config, type)
      case 'anthropic':
        return this.callAnthropic<T>(enhancedPrompt, config)
      case 'cohere':
        return this.callCohere<T>(enhancedPrompt, config)
      default:
        throw new Error(`Unsupported AI provider: ${config.provider}`)
    }
  }

  private async getOpenAIClient(): Promise<OpenAI> {
    if (!this.openai) {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
        organization: process.env.OPENAI_ORG_ID,
        maxRetries: this.retryConfig.maxAttempts,
        timeout: 30000 // 30 seconds
      })
    }
    return this.openai
  }

  private async callWithRetry<T>(
    operation: () => Promise<T>,
    errorMessage: string
  ): Promise<T> {
    try {
      return await backOff(() => operation(), {
        numOfAttempts: this.retryConfig.maxAttempts,
        startingDelay: this.retryConfig.initialDelayMs,
        maxDelay: this.retryConfig.maxDelayMs,
        retry: (error: any) => {
          // Retry on rate limits and temporary errors
          const isRateLimit = error?.error?.type === 'rate_limit_error'
          const isServerError = error?.error?.type === 'server_error'
          const isTimeout = error?.error?.code === 'timeout'
          
          return isRateLimit || isServerError || isTimeout
        }
      })
    } catch (error) {
      const openAIError = error as OpenAIError
      console.error(errorMessage, {
        message: openAIError.error?.message || error,
        type: openAIError.error?.type,
        code: openAIError.error?.code,
        attempts: this.retryConfig.maxAttempts
      })
      throw new Error(`${errorMessage}: ${openAIError.error?.message || 'Unknown error'}`)
    }
  }

  private async callOpenAI<T>(prompt: string, config: AIConfig, type: AIAnalysisType): Promise<AIResponse<T>> {
    const operation = async () => {
      const openai = await this.getOpenAIClient()
      const template = this.promptTemplates[type]
      
      const completion = await openai.chat.completions.create({
        model: config.model || this.serviceConfig.model,
        messages: [
          {
            role: 'system',
            content: `${template.system}\n\n${template.format}`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: this.serviceConfig.temperature,
        max_tokens: this.serviceConfig.maxTokens,
        response_format: { type: 'json_object' }
      })

      const content = completion.choices[0]?.message?.content
      if (!content) {
        throw new Error('No content in OpenAI response')
      }

      let result: T
      try {
        result = JSON.parse(content) as T
      } catch (error) {
        console.error('Failed to parse OpenAI response:', content)
        throw new Error('Invalid JSON response from OpenAI')
      }

      return {
        result,
        confidence: completion.choices[0]?.message?.role === 'assistant' ? 0.9 : 0.7,
        metadata: {
          model: completion.model,
          usage: completion.usage,
          finish_reason: completion.choices[0]?.finish_reason,
          attempts: 1
        }
      }
    }

    return this.callWithRetry(
      operation,
      `OpenAI ${type} analysis failed`
    )
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
      aiConfig,
      'sentiment'
    )
    return response.result.summary
  }

  async generateTags(prompt: string, config?: AIConfig): Promise<string[]> {
    const aiConfig = config || await this.getConfig()
    const response = await this.callAI<{ tags: string[] }>(
      `Generate tags: ${prompt}`,
      aiConfig,
      'sentiment'
    )
    return response.result.tags
  }

  async generateTitle(prompt: string, config?: AIConfig): Promise<string> {
    const aiConfig = config || await this.getConfig()
    const response = await this.callAI<{ title: string }>(
      `Generate title: ${prompt}`,
      aiConfig,
      'sentiment'
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
        .filter(p => p.confidence > this.serviceConfig.relevanceThreshold)
        .map(p => p.explanation)
        .slice(0, this.serviceConfig.maxResults)

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

  private async enhancePromptWithRAG(prompt: string, type: AIAnalysisType): Promise<string> {
    const context = await this.getRAGContext(prompt)
    
    if (context.relevantContent.length === 0) {
      return prompt
    }

    const template = this.promptTemplates[type]

    return `
Given this historical context:
${context.relevantContent.join('\n\n')}

Confidence: ${context.confidence.toFixed(2)}

Original prompt:
${prompt}

Please provide a response that incorporates the historical context where relevant.

${template.system}

${template.format}
`
  }
}