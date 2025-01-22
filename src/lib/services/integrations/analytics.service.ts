import type { SupabaseClient } from '@supabase/supabase-js'
import type { AnalyticsEvent, AnalyticsEventType } from '@/lib/types/integrations'
import type { Database } from '@/types/supabase'

interface AnalyticsConfig {
  provider: string
  apiKey: string
  options?: Record<string, unknown>
}

export class AnalyticsService {
  private static instance: AnalyticsService
  private eventQueue: AnalyticsEvent[] = []
  private isProcessing = false
  private batchSize = 10
  private flushInterval = 5000 // 5 seconds

  private constructor(
    private readonly supabase: SupabaseClient<Database>
  ) {
    // Set up periodic flush
    setInterval(() => this.flush(), this.flushInterval)
  }

  public static getInstance(supabase: SupabaseClient<Database>): AnalyticsService {
    if (!AnalyticsService.instance) {
      AnalyticsService.instance = new AnalyticsService(supabase)
    }
    return AnalyticsService.instance
  }

  // Event Tracking
  async trackEvent(
    type: AnalyticsEventType,
    data: Record<string, any>,
    metadata?: Record<string, any>
  ): Promise<void> {
    const event: AnalyticsEvent = {
      id: crypto.randomUUID(),
      type,
      timestamp: new Date().toISOString(),
      data,
      metadata,
      userId: await this.getCurrentUserId(),
      sessionId: this.getSessionId()
    }

    this.eventQueue.push(event)

    // Flush if queue is full
    if (this.eventQueue.length >= this.batchSize) {
      await this.flush()
    }
  }

  // Batch Processing
  private async flush(): Promise<void> {
    if (this.isProcessing || this.eventQueue.length === 0) return

    this.isProcessing = true
    const events = this.eventQueue.splice(0, this.batchSize)

    try {
      await this.persistEvents(events)
      await this.processEvents(events)
    } catch (error) {
      console.error('Failed to process analytics events:', error)
      // Re-queue failed events
      this.eventQueue.unshift(...events)
    } finally {
      this.isProcessing = false
    }
  }

  private async persistEvents(events: AnalyticsEvent[]): Promise<void> {
    const { error } = await this.supabase
      .from('analytics_events')
      .insert(events)

    if (error) throw error
  }

  // Event Processing
  private async processEvents(events: AnalyticsEvent[]): Promise<void> {
    // Group events by type for efficient processing
    const eventsByType = this.groupEventsByType(events)

    // Process each event type in parallel
    await Promise.all(
      Object.entries(eventsByType).map(([type, events]) =>
        this.processEventType(type as AnalyticsEventType, events)
      )
    )
  }

  private async processEventType(type: AnalyticsEventType, events: AnalyticsEvent[]): Promise<void> {
    switch (type) {
      case 'page_view':
        await this.processPageViews(events)
        break
      case 'ticket_action':
        await this.processTicketActions(events)
        break
      case 'search':
        await this.processSearchEvents(events)
        break
      case 'filter':
        await this.processFilterEvents(events)
        break
      case 'bulk_action':
        await this.processBulkActions(events)
        break
      case 'workflow_trigger':
        await this.processWorkflowTriggers(events)
        break
    }
  }

  // Event Type Processors
  private async processPageViews(events: AnalyticsEvent[]): Promise<void> {
    const { error } = await this.supabase
      .from('analytics_page_views')
      .insert(events.map(event => ({
        path: event.data.path,
        timestamp: event.timestamp,
        user_id: event.userId,
        session_id: event.sessionId,
        metadata: event.metadata
      })))

    if (error) throw error
  }

  private async processTicketActions(events: AnalyticsEvent[]): Promise<void> {
    const { error } = await this.supabase
      .from('analytics_ticket_actions')
      .insert(events.map(event => ({
        action: event.data.action,
        ticket_id: event.data.ticketId,
        timestamp: event.timestamp,
        user_id: event.userId,
        metadata: event.metadata
      })))

    if (error) throw error
  }

  private async processSearchEvents(events: AnalyticsEvent[]): Promise<void> {
    const { error } = await this.supabase
      .from('analytics_searches')
      .insert(events.map(event => ({
        query: event.data.query,
        results_count: event.data.resultsCount,
        timestamp: event.timestamp,
        user_id: event.userId,
        metadata: event.metadata
      })))

    if (error) throw error
  }

  private async processFilterEvents(events: AnalyticsEvent[]): Promise<void> {
    const { error } = await this.supabase
      .from('analytics_filters')
      .insert(events.map(event => ({
        filters: event.data.filters,
        results_count: event.data.resultsCount,
        timestamp: event.timestamp,
        user_id: event.userId,
        metadata: event.metadata
      })))

    if (error) throw error
  }

  private async processBulkActions(events: AnalyticsEvent[]): Promise<void> {
    const { error } = await this.supabase
      .from('analytics_bulk_actions')
      .insert(events.map(event => ({
        action: event.data.action,
        affected_items: event.data.affectedItems,
        timestamp: event.timestamp,
        user_id: event.userId,
        metadata: event.metadata
      })))

    if (error) throw error
  }

  private async processWorkflowTriggers(events: AnalyticsEvent[]): Promise<void> {
    const { error } = await this.supabase
      .from('analytics_workflow_triggers')
      .insert(events.map(event => ({
        workflow_id: event.data.workflowId,
        trigger_type: event.data.triggerType,
        timestamp: event.timestamp,
        user_id: event.userId,
        metadata: event.metadata
      })))

    if (error) throw error
  }

  // Utility Methods
  private groupEventsByType(events: AnalyticsEvent[]): Record<string, AnalyticsEvent[]> {
    return events.reduce((acc, event) => {
      if (!acc[event.type]) {
        acc[event.type] = []
      }
      acc[event.type].push(event)
      return acc
    }, {} as Record<string, AnalyticsEvent[]>)
  }

  private async getCurrentUserId(): Promise<string | undefined> {
    const { data: { user } } = await this.supabase.auth.getUser()
    return user?.id
  }

  private getSessionId(): string {
    let sessionId = sessionStorage.getItem('analytics_session_id')
    if (!sessionId) {
      sessionId = crypto.randomUUID()
      sessionStorage.setItem('analytics_session_id', sessionId)
    }
    return sessionId
  }
} 