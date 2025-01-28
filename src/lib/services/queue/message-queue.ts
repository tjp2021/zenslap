import { CrisisType, Severity, ResponseProtocol } from '@/types/ai'

export interface Message {
  id: string
  content: string
  timestamp: Date
  metadata?: {
    userId?: string
    source?: string
    priority?: 'high' | 'medium' | 'low'
    tags?: string[]
  }
}

export interface QueueMetrics {
  enqueuedCount: number
  dequeuedCount: number
  averageLatency: number
  maxLatency: number
  errorCount: number
}

export interface QueueConfig {
  maxBatchSize: number
  maxLatencyMs: number
  processingTimeoutMs: number
  retryAttempts: number
}

export class MessageQueue {
  private queue: Message[] = []
  private metrics: QueueMetrics = {
    enqueuedCount: 0,
    dequeuedCount: 0,
    averageLatency: 0,
    maxLatency: 0,
    errorCount: 0
  }

  private readonly config: QueueConfig = {
    maxBatchSize: 10,
    maxLatencyMs: 100,
    processingTimeoutMs: 5000,
    retryAttempts: 3
  }

  constructor(config?: Partial<QueueConfig>) {
    this.config = { ...this.config, ...config }
  }

  async enqueue(message: Omit<Message, 'id' | 'timestamp'>): Promise<Message> {
    const startTime = Date.now()
    
    try {
      const newMessage: Message = {
        ...message,
        id: crypto.randomUUID(),
        timestamp: new Date(),
      }
      
      this.queue.push(newMessage)
      this.updateEnqueueMetrics(Date.now() - startTime)
      
      return newMessage
    } catch (error) {
      this.metrics.errorCount++
      throw new Error('Failed to enqueue message')
    }
  }

  async dequeueUpTo(batchSize: number = this.config.maxBatchSize): Promise<Message[]> {
    const startTime = Date.now()
    const size = Math.min(batchSize, this.config.maxBatchSize)
    
    try {
      const messages = this.queue.splice(0, size)
      this.updateDequeueMetrics(messages.length, Date.now() - startTime)
      
      return messages
    } catch (error) {
      this.metrics.errorCount++
      throw new Error('Failed to dequeue messages')
    }
  }

  async peek(): Promise<Message | null> {
    return this.queue[0] || null
  }

  getMetrics(): QueueMetrics {
    return { ...this.metrics }
  }

  getLength(): number {
    return this.queue.length
  }

  private updateEnqueueMetrics(latency: number): void {
    this.metrics.enqueuedCount++
    this.updateLatencyMetrics(latency)
  }

  private updateDequeueMetrics(count: number, latency: number): void {
    this.metrics.dequeuedCount += count
    this.updateLatencyMetrics(latency)
  }

  private updateLatencyMetrics(latency: number): void {
    this.metrics.maxLatency = Math.max(this.metrics.maxLatency, latency)
    this.metrics.averageLatency = (
      (this.metrics.averageLatency * (this.metrics.enqueuedCount - 1) + latency) /
      this.metrics.enqueuedCount
    )
  }
} 