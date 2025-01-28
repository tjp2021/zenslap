import { createClient } from '@supabase/supabase-js'
import { Database } from '@/lib/database.types'
import {
  MonitoringEvent,
  EventAnalysis,
  MonitoringConfig,
  MonitoringMetrics,
  Severity,
  QueueEntry,
  NotificationEntry,
  AuditLogEntry
} from './types'

const DEFAULT_CONFIG: MonitoringConfig = {
  pollIntervalMs: 100,
  maxBatchSize: 10,
  maxProcessingTimeMs: 1000,
  errorThreshold: 5,
  retryAttempts: 3
}

export class MonitoringService {
  private isRunning = false
  private metrics: MonitoringMetrics = {
    processedCount: 0,
    errorCount: 0,
    criticalCount: 0,
    averageProcessingTime: 0,
    batchSize: 0
  }

  private readonly config: MonitoringConfig
  private readonly supabase
  
  constructor(
    config?: Partial<MonitoringConfig>
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    
    // Initialize Supabase client
    this.supabase = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    )
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      console.warn('Monitor is already running')
      return
    }

    this.isRunning = true
    console.log('Starting monitoring service with config:', this.config)

    while (this.isRunning) {
      try {
        await this.processBatch()
      } catch (error) {
        console.error('Error processing batch:', error)
        this.metrics.errorCount++
        
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
    console.log('Stopping monitoring service')
  }

  getMetrics(): MonitoringMetrics {
    return { ...this.metrics }
  }

  private async processBatch(): Promise<void> {
    const startTime = Date.now()

    // Fetch unprocessed events from queue
    const { data: events, error } = await this.supabase
      .from('message_queue')
      .select('*')
      .eq('status', 'pending')
      .limit(this.config.maxBatchSize)
      .order('created_at', { ascending: true })

    if (error) throw error
    if (!events?.length) return

    this.metrics.batchSize = events.length

    try {
      // Process each event
      await Promise.all(events.map(event => this.processEvent(event)))

      // Update metrics
      this.updateProcessingMetrics(events.length, Date.now() - startTime)
    } catch (error) {
      console.error('Batch processing error:', error)
      throw error
    }
  }

  private async processEvent(queueEntry: QueueEntry): Promise<void> {
    const startTime = Date.now()

    try {
      // 1. Create monitoring event
      const event: MonitoringEvent = {
        type: queueEntry.type as MonitoringEvent['type'],
        severity: (queueEntry.initial_severity as Severity) || 'low',
        data: queueEntry.data as Record<string, any>,
        metadata: {
          timestamp: new Date(queueEntry.created_at || new Date()),
          source: queueEntry.source,
          context: queueEntry.context as Record<string, any> | undefined,
          userId: queueEntry.user_id || undefined,
          sessionId: queueEntry.session_id || undefined
        }
      }

      // 2. Analyze event
      const analysis = await this.analyzeEvent(event)

      // 3. Handle critical events
      if (analysis.severity === 'critical') {
        await this.handleCriticalEvent(event, analysis)
      }

      // 4. Create notification if needed
      if (analysis.severity !== 'low') {
        await this.createNotification(event, analysis)
      }

      // 5. Log for audit
      await this.logToAudit(event, analysis)

      // 6. Update queue entry status
      await this.supabase
        .from('message_queue')
        .update({
          status: 'processed',
          processed_at: new Date().toISOString(),
          processing_metadata: {
            duration: Date.now() - startTime,
            analysis: {
              severity: analysis.severity,
              confidence: analysis.confidence,
              reasoning: analysis.reasoning,
              suggestedActions: analysis.suggestedActions,
              metadata: {
                patterns: analysis.metadata.patterns,
                modelInfo: analysis.metadata.modelInfo
              }
            }
          }
        } satisfies Partial<QueueEntry>)
        .eq('id', queueEntry.id)

    } catch (error) {
      console.error('Event processing error:', error)
      
      // Update queue entry with error
      await this.supabase
        .from('message_queue')
        .update({
          status: 'error',
          error: (error as Error).message,
          retry_count: (queueEntry.retry_count || 0) + 1
        } satisfies Partial<QueueEntry>)
        .eq('id', queueEntry.id)

      throw error
    }
  }

  private async analyzeEvent(event: MonitoringEvent): Promise<EventAnalysis> {
    // TODO: Implement event analysis using AI service
    // For now return a basic analysis
    return {
      severity: event.severity,
      confidence: 1,
      reasoning: 'Basic analysis - severity inherited from event',
      suggestedActions: [],
      metadata: {
        patterns: [],
        modelInfo: {
          provider: 'system',
          model: 'basic',
          version: '1.0'
        }
      }
    }
  }

  private async handleCriticalEvent(event: MonitoringEvent, analysis: EventAnalysis): Promise<void> {
    this.metrics.criticalCount++

    // Trigger webhook if configured
    if (this.config.criticalEventWebhook) {
      try {
        await fetch(this.config.criticalEventWebhook, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ event, analysis })
        })
      } catch (error) {
        console.error('Failed to trigger critical event webhook:', error)
      }
    }
  }

  private async createNotification(event: MonitoringEvent, analysis: EventAnalysis): Promise<void> {
    if (!event.metadata.userId) return

    await this.supabase
      .from('ticket_activities')
      .insert({
        activity_type: 'monitoring_alert',
        ticket_id: (event.data as any).ticketId,
        actor_id: event.metadata.userId,
        content: {
          event: event.data,
          analysis: {
            severity: analysis.severity,
            reasoning: analysis.reasoning,
            suggestedActions: analysis.suggestedActions
          }
        }
      })
  }

  private async logToAudit(event: MonitoringEvent, analysis: EventAnalysis): Promise<void> {
    const serializedMetadata = {
      timestamp: event.metadata.timestamp.toISOString(),
      source: event.metadata.source,
      context: event.metadata.context,
      userId: event.metadata.userId,
      sessionId: event.metadata.sessionId
    }

    await this.supabase
      .from('monitoring_audit_log')
      .insert({
        event_type: event.type,
        severity: analysis.severity,
        event_data: event.data,
        analysis_data: {
          severity: analysis.severity,
          confidence: analysis.confidence,
          reasoning: analysis.reasoning,
          suggestedActions: analysis.suggestedActions,
          metadata: analysis.metadata
        },
        metadata: serializedMetadata
      } satisfies Partial<AuditLogEntry>)
  }

  private updateProcessingMetrics(count: number, processingTime: number): void {
    this.metrics.processedCount += count
    this.metrics.lastProcessedAt = new Date()
    this.metrics.averageProcessingTime = (
      (this.metrics.averageProcessingTime * (this.metrics.processedCount - count) +
        processingTime) /
      this.metrics.processedCount
    )
  }
} 