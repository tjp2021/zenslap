import OpenAI from 'openai'
import { AIServiceConfig } from '@/types/ai'

export class OpenAIService {
  private static instance: OpenAIService | null = null
  private client: OpenAI

  private constructor() {
    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      organization: process.env.OPENAI_ORG_ID
    })
  }

  public static getInstance(): OpenAIService {
    if (!OpenAIService.instance) {
      OpenAIService.instance = new OpenAIService()
    }
    return OpenAIService.instance
  }

  public async generateAnalysis(
    prompt: string,
    config?: Partial<AIServiceConfig>
  ): Promise<{
    content: string
    tokensUsed: number
  }> {
    try {
      const completion = await this.client.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are an expert support analyst with deep knowledge of technical systems and customer service. Your goal is to provide clear, actionable insights based on historical ticket patterns.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: config?.temperature ?? 0.7,
        max_tokens: config?.maxTokens ?? 1000,
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0
      })

      const response = completion.choices[0]?.message?.content || 'No analysis generated'
      
      return {
        content: response,
        tokensUsed: completion.usage?.total_tokens || 0
      }
    } catch (error) {
      console.error('OpenAI API Error:', error)
      throw new Error('Failed to generate analysis')
    }
  }

  public async countTokens(text: string): Promise<number> {
    // For MVP, use a simple approximation (GPT-3 tokenizer averages ~4 chars per token)
    return Math.ceil(text.length / 4)
  }
} 