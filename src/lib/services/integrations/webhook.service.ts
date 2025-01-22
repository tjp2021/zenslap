import type { SupabaseClient } from '@supabase/supabase-js'
import type { WebhookConfig, WebhookEvent } from '@/lib/types/integrations'
import type { Database } from '@/types/supabase'
import { createHmac } from 'crypto'
import { z } from 'zod'
import { Ticket } from '@/lib/types'

interface WebhookPayload {
  event: string
  data: unknown
  timestamp: string
}

export class WebhookService {
  private static instance: WebhookService | null = null
  private webhooks: Map<string, WebhookConfig> = new Map()

  private constructor(
    private readonly supabase: SupabaseClient<Database>
  ) {}

  public static getInstance(supabase: SupabaseClient<Database>): WebhookService {
    if (!WebhookService.instance) {
      WebhookService.instance = new WebhookService(supabase)
    }
    return WebhookService.instance
  }

  public static resetInstance(): void {
    WebhookService.instance = null
  }

  // CRUD Operations
  async createWebhook(config: Omit<WebhookConfig, 'id' | 'createdAt' | 'updatedAt'>): Promise<WebhookConfig> {
    const { data, error } = await this.supabase
      .from('webhooks')
      .insert([{
        ...config,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
      .select()
      .single()

    if (error) throw error
    const webhook = data as WebhookConfig
    this.webhooks.set(webhook.id, webhook)
    return webhook
  }

  async getWebhook(id: string): Promise<WebhookConfig | null> {
    // Check cache first
    if (this.webhooks.has(id)) {
      return this.webhooks.get(id)!
    }

    const { data, error } = await this.supabase
      .from('webhooks')
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw error
    if (!data) return null

    const webhook = data as WebhookConfig
    this.webhooks.set(webhook.id, webhook)
    return webhook
  }

  // Event Handling
  async triggerWebhook(event: WebhookEvent, payload: any): Promise<void> {
    const webhooks = await this.getWebhooksForEvent(event)
    
    const promises = webhooks.map(webhook => {
      if (!webhook.isActive) return Promise.resolve()
      
      return this.sendWebhookRequest(webhook, {
        event,
        payload,
        timestamp: new Date().toISOString()
      })
    })

    await Promise.allSettled(promises)
  }

  private async getWebhooksForEvent(event: WebhookEvent): Promise<WebhookConfig[]> {
    const { data, error } = await this.supabase
      .from('webhooks')
      .select('*')
      .contains('events', [event])

    if (error) throw error
    return (data || []) as WebhookConfig[]
  }

  private async sendWebhookRequest(
    webhook: WebhookConfig, 
    data: Record<string, any>
  ): Promise<Response> {
    const signature = this.generateSignature(webhook.secret, JSON.stringify(data))
    
    const response = await fetch(webhook.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Signature': signature,
        ...(webhook.headers || {})
      },
      body: JSON.stringify(data)
    })

    if (!response.ok) {
      // Handle retry logic here if configured
      if (webhook.retryConfig) {
        await this.handleRetry(webhook, data)
      }
      throw new Error(`Webhook request failed: ${response.statusText}`)
    }

    return response
  }

  private generateSignature(secret: string, payload: string): string {
    return createHmac('sha256', secret)
      .update(payload)
      .digest('hex')
  }

  private async handleRetry(
    webhook: WebhookConfig,
    data: Record<string, any>,
    attempt = 1
  ): Promise<void> {
    if (!webhook.retryConfig || attempt >= webhook.retryConfig.maxAttempts) {
      return
    }

    const delay = webhook.retryConfig.initialDelay * 
      Math.pow(webhook.retryConfig.backoffRate, attempt - 1)

    await new Promise(resolve => setTimeout(resolve, delay))

    try {
      await this.sendWebhookRequest(webhook, data)
    } catch (_error) {
      console.error('Failed to send webhook:', _error)
      await this.handleRetry(webhook, data, attempt + 1)
    }
  }
} 