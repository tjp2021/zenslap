import { AIService } from './integrations/ai.service'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '@/lib/database.types'
import type { NotificationWithDetails } from '@/lib/types/notifications'

interface NotificationAnalysis {
  priority: 'high' | 'medium' | 'low'
  confidence: number
  metadata: {
    reasoning: string
    suggestedActions?: string[]
    relatedPatterns?: string[]
    modelInfo: {
      provider: string
      model: string
      version?: string
    }
  }
}

export class NotificationAIService {
  private static instance: NotificationAIService | null = null
  private aiService: AIService
  private supabase = createClientComponentClient<Database>()

  private constructor() {
    this.aiService = new AIService()
  }

  public static getInstance(): NotificationAIService {
    if (!NotificationAIService.instance) {
      NotificationAIService.instance = new NotificationAIService()
    }
    return NotificationAIService.instance
  }

  async analyzeNotification(notification: NotificationWithDetails): Promise<NotificationAnalysis> {
    try {
      // Extract relevant content for analysis
      const content = {
        ticketTitle: notification.activity.ticket.title,
        activityContent: notification.activity.content,
        activityType: notification.activity.type,
        timestamp: notification.created_at
      }

      // Get urgency analysis
      const urgencyResult = await this.aiService.analyzeTicket(
        notification.activity.ticket_id,
        'urgency_detection',
        JSON.stringify(content)
      )

      // Get sentiment analysis
      const sentimentResult = await this.aiService.analyzeTicket(
        notification.activity.ticket_id,
        'sentiment',
        JSON.stringify(content)
      )

      // Combine analyses to determine priority
      const priority = this.determinePriority(
        urgencyResult.result as any,
        sentimentResult.result as any
      )

      // Calculate combined confidence
      const confidence = (urgencyResult.confidence + sentimentResult.confidence) / 2

      // Update notification in database
      await this.updateNotificationAnalysis(notification.id, {
        priority,
        confidence,
        metadata: {
          reasoning: this.generateReasoning(urgencyResult.result as any, sentimentResult.result as any),
          suggestedActions: this.generateSuggestedActions(urgencyResult.result as any),
          relatedPatterns: [], // To be implemented with pattern detection
          modelInfo: {
            provider: urgencyResult.modelInfo.provider,
            model: urgencyResult.modelInfo.model,
            version: urgencyResult.modelInfo.version
          }
        }
      })

      return {
        priority,
        confidence,
        metadata: {
          reasoning: this.generateReasoning(urgencyResult.result as any, sentimentResult.result as any),
          suggestedActions: this.generateSuggestedActions(urgencyResult.result as any),
          relatedPatterns: [], // To be implemented with pattern detection
          modelInfo: {
            provider: urgencyResult.modelInfo.provider,
            model: urgencyResult.modelInfo.model,
            version: urgencyResult.modelInfo.version
          }
        }
      }
    } catch (error) {
      console.error('Failed to analyze notification:', error)
      throw error
    }
  }

  private determinePriority(
    urgencyResult: { isUrgent: boolean; suggestedPriority?: string },
    sentimentResult: { sentiment: string; score: number }
  ): 'high' | 'medium' | 'low' {
    if (urgencyResult.isUrgent) return 'high'
    if (urgencyResult.suggestedPriority) return urgencyResult.suggestedPriority as 'high' | 'medium' | 'low'
    if (sentimentResult.sentiment === 'negative' && sentimentResult.score > 0.7) return 'high'
    if (sentimentResult.sentiment === 'negative') return 'medium'
    return 'low'
  }

  private generateReasoning(urgencyResult: any, sentimentResult: any): string {
    const reasons = []
    if (urgencyResult.isUrgent) {
      reasons.push(`Urgent: ${urgencyResult.reason}`)
    }
    if (sentimentResult.sentiment === 'negative') {
      reasons.push(`Negative sentiment detected (confidence: ${sentimentResult.score})`)
    }
    return reasons.join('. ') || 'Standard priority based on content analysis'
  }

  private generateSuggestedActions(urgencyResult: any): string[] {
    const actions = []
    if (urgencyResult.isUrgent) {
      actions.push('Review immediately')
      actions.push('Consider escalation')
    }
    if (urgencyResult.suggestedPriority === 'high') {
      actions.push('Monitor closely')
    }
    return actions
  }

  private async updateNotificationAnalysis(
    notificationId: string,
    analysis: NotificationAnalysis
  ): Promise<void> {
    const { error } = await this.supabase
      .from('notifications')
      .update({
        priority: analysis.priority,
        confidence: analysis.confidence,
        ai_metadata: analysis.metadata
      })
      .eq('id', notificationId)

    if (error) {
      console.error('Failed to update notification analysis:', error)
      throw error
    }
  }
} 