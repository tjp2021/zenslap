import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '@/lib/database.types'
import { UserRole } from '@/lib/types'

export interface CriticalAlertData {
  severity: string
  requiresImmediate: boolean
  crisisType?: string
  responseProtocol?: string
  confidence: number
  metadata?: Record<string, any>
  ticketId: string
}

export class NotificationService {
  private static instance: NotificationService | null = null
  private supabase = createClientComponentClient<Database>()

  private constructor() {}

  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService()
    }
    return NotificationService.instance
  }

  async createCriticalAlert(alertData: CriticalAlertData): Promise<void> {
    try {
      // 1. Create alert record
      const { data: alert, error: alertError } = await this.supabase
        .from('critical_alerts')
        .insert({
          ticket_id: alertData.ticketId,
          severity: alertData.severity,
          requires_immediate: alertData.requiresImmediate,
          crisis_type: alertData.crisisType,
          response_protocol: alertData.responseProtocol,
          confidence: alertData.confidence,
          metadata: alertData.metadata,
          status: 'pending'
        })
        .select()
        .single()

      if (alertError) throw alertError

      // 2. Get all admins and agents
      const { data: users, error: usersError } = await this.supabase
        .from('users_secure')
        .select('id, role')
        .in('role', [UserRole.ADMIN, UserRole.AGENT])

      if (usersError) throw usersError

      // 3. Create notifications for each eligible user
      const notifications = users.map(user => ({
        user_id: user.id,
        alert_id: alert.id,
        priority: 'high',
        status: 'unread',
        type: 'critical_alert'
      }))

      const { error: notifyError } = await this.supabase
        .from('notifications')
        .insert(notifications)

      if (notifyError) throw notifyError

    } catch (error) {
      console.error('Failed to create critical alert:', error)
      throw error
    }
  }
} 