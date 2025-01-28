import { AIService } from '../ai-service'
import { MessageQueue, Message, QueueMetrics } from './message-queue'
import { TicketAnalysis } from '@/types/ai'

export interface MonitorMetrics {
  processedCount: number
  errorCount: number
  averageProcessingTime: number
  criticalAlertCount: number
  lastProcessedTimestamp?: Date
}

export interface MonitorConfig {
  pollIntervalMs: number
  maxBatchSize: number
  maxProcessingTimeMs: number
  errorThreshold: number
}

export class RealTimeMonitor {
  private isRunning: boolean = false
  private metrics: MonitorMetrics = {
    processedCount: 0,
    errorCount: 0,
    averageProcessingTime: 0,
    criticalAlertCount: 0
  }

  private readonly config: MonitorConfig = {
    pollIntervalMs: 100,
    maxBatchSize: 10,
    maxProcessingTimeMs: 1000,
    errorThreshold: 5
  }

  constructor(
    private readonly queue: MessageQueue,
    private readonly aiService: AIService,
    config?: Partial<MonitorConfig>
  ) {
    this.config = { ...this.config, ...config }
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      console.warn('Monitor is already running')
      return
    }

    this.isRunning = true
    console.log('Starting real-time monitor with config:', this.config)

    while (this.isRunning) {
      try {
        await this.processBatch()
      } catch (error) {
        console.error('Error processing batch:', error)
        
        if (this.metrics.errorCount >= this.config.errorThreshold) {
          this.stop()
          throw new Error('Monitor stopped due to error threshold exceeded')
        }
      }

      // Wait for next poll interval
      await new Promise(resolve => setTimeout(resolve, this.config.pollIntervalMs))
    }
  }

  stop(): void {
    this.isRunning = false
    console.log('Stopping real-time monitor')
  }

  getMetrics(): MonitorMetrics {
    return { ...this.metrics }
  }

  private async processBatch(): Promise<void> {
    const messages = await this.queue.dequeueUpTo(this.config.maxBatchSize)
    
    if (messages.length === 0) {
      return
    }

    const startTime = Date.now()
    
    try {
      await Promise.all(messages.map(msg => this.processMessage(msg)))
      
      this.updateProcessingMetrics(
        messages.length,
        Date.now() - startTime
      )
    } catch (error) {
      throw error
    }
  }

  private async processMessage(message: Message): Promise<void> {
    const startTime = Date.now()
    
    try {
      // Analyze message for potential crisis
      const analysis = await this.aiService.analyzeTicket({
        ticketId: message.id,
        content: message.content,
        metadata: message.metadata
      })

      await this.handleAnalysis(analysis)
      
      this.metrics.lastProcessedTimestamp = new Date()
    } catch (error) {
      console.error('Error processing message:', {
        messageId: message.id,
        error
      })
      this.metrics.errorCount++
      throw error
    }

    // Check processing time limit
    if (Date.now() - startTime > this.config.maxProcessingTimeMs) {
      console.warn('Message processing exceeded time limit:', {
        messageId: message.id,
        processingTime: Date.now() - startTime
      })
    }
  }

  private async handleAnalysis(analysis: TicketAnalysis): Promise<void> {
    // Track critical alerts
    if (analysis.metadata?.severity === 'critical' || 
        analysis.metadata?.requiresImmediate) {
      this.metrics.criticalAlertCount++
      
      // TODO: Trigger immediate notification system
      console.log('Critical alert detected:', {
        confidence: analysis.confidence,
        metadata: analysis.metadata
      })
    }
  }

  private updateProcessingMetrics(count: number, processingTime: number): void {
    this.metrics.processedCount += count
    this.metrics.averageProcessingTime = (
      (this.metrics.averageProcessingTime * (this.metrics.processedCount - count) +
        processingTime) /
      this.metrics.processedCount
    )
  }
} 