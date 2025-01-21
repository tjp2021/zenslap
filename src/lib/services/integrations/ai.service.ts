import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { AIConfig, AIAnalysis, AIAnalysisType } from '@/lib/types/integrations'

export class AIService {
  private static instance: AIService
  private supabase = createClientComponentClient()
  private config: AIConfig | null = null

  private constructor() {
    // Private constructor for singleton pattern
  }

  public static getInstance(): AIService {
    if (!AIService.instance) {
      AIService.instance = new AIService()
    }
    return AIService.instance
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
    
    // Get the appropriate analysis function based on type
    const analyzeFunction = this.getAnalysisFunction(type)
    
    const result = await analyzeFunction(content, config)
    
    // Store analysis result
    const analysis: Omit<AIAnalysis, 'id'> = {
      ticketId,
      type,
      result,
      confidence: result.confidence || 0,
      timestamp: new Date().toISOString(),
      modelInfo: {
        provider: config.provider,
        model: config.model,
        version: config.options?.version
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

  private getAnalysisFunction(type: AIAnalysisType): (content: string, config: AIConfig) => Promise<any> {
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
  private async analyzeSentiment(content: string, config: AIConfig): Promise<any> {
    const prompt = `Analyze the sentiment of the following text. Return a JSON object with 'sentiment' (positive/negative/neutral) and 'confidence' (0-1):

Content: ${content}`

    return this.callAI(prompt, config)
  }

  private async analyzePriority(content: string, config: AIConfig): Promise<any> {
    const prompt = `Analyze the priority level needed for this ticket. Return a JSON object with 'priority' (high/medium/low) and 'confidence' (0-1):

Content: ${content}`

    return this.callAI(prompt, config)
  }

  private async analyzeCategory(content: string, config: AIConfig): Promise<any> {
    const prompt = `Detect the category of this ticket. Return a JSON object with 'category' and 'confidence' (0-1):

Content: ${content}`

    return this.callAI(prompt, config)
  }

  private async suggestResponse(content: string, config: AIConfig): Promise<any> {
    const prompt = `Suggest a response for this ticket. Return a JSON object with 'response' and 'confidence' (0-1):

Content: ${content}`

    return this.callAI(prompt, config)
  }

  private async analyzeUrgency(content: string, config: AIConfig): Promise<any> {
    const prompt = `Analyze the urgency of this ticket. Return a JSON object with 'urgency' (immediate/high/medium/low) and 'confidence' (0-1):

Content: ${content}`

    return this.callAI(prompt, config)
  }

  // AI Provider Integration
  private async callAI(prompt: string, config: AIConfig): Promise<any> {
    switch (config.provider) {
      case 'openai':
        return this.callOpenAI(prompt, config)
      case 'anthropic':
        return this.callAnthropic(prompt, config)
      case 'cohere':
        return this.callCohere(prompt, config)
      default:
        throw new Error(`Unsupported AI provider: ${config.provider}`)
    }
  }

  private async callOpenAI(prompt: string, config: AIConfig): Promise<any> {
    // Implement OpenAI API call
    throw new Error('OpenAI integration not implemented')
  }

  private async callAnthropic(prompt: string, config: AIConfig): Promise<any> {
    // Implement Anthropic API call
    throw new Error('Anthropic integration not implemented')
  }

  private async callCohere(prompt: string, config: AIConfig): Promise<any> {
    // Implement Cohere API call
    throw new Error('Cohere integration not implemented')
  }
} 