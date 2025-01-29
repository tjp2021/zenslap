import { createClient } from '@supabase/supabase-js'
import { Database } from '@/lib/database.types'

type Tables = Database['public']['Tables']
type AuditLogRow = Tables['audit_log']['Row']
type AuditLogInsert = Tables['audit_log']['Insert']

export type AuditActionType = AuditLogRow['action_type']
export type AuditEntityType = AuditLogRow['entity_type']
export type AuditLogEntry = AuditLogRow

export class AuditService {
  private supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  )

  async log(entry: AuditLogInsert): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('audit_log')
        .insert(entry)

      if (error) throw error
    } catch (error) {
      console.error('Error logging audit entry:', error)
      throw error
    }
  }

  async getEntityHistory(entityType: AuditEntityType, entityId: string): Promise<AuditLogEntry[]> {
    try {
      const { data, error } = await this.supabase
        .from('audit_log')
        .select('*')
        .eq('entity_type', entityType)
        .eq('entity_id', entityId)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error fetching entity history:', error)
      throw error
    }
  }

  async getActorHistory(actorId: string): Promise<AuditLogEntry[]> {
    try {
      const { data, error } = await this.supabase
        .from('audit_log')
        .select('*')
        .eq('actor_id', actorId)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error fetching actor history:', error)
      throw error
    }
  }

  async getRecentActivity(limit: number = 50): Promise<AuditLogEntry[]> {
    try {
      const { data, error } = await this.supabase
        .from('audit_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error fetching recent activity:', error)
      throw error
    }
  }

  async searchAuditLog(params: {
    action_types?: AuditActionType[]
    entity_types?: AuditEntityType[]
    actor_ids?: string[]
    start_date?: Date
    end_date?: Date
    limit?: number
  }): Promise<AuditLogEntry[]> {
    try {
      let query = this.supabase
        .from('audit_log')
        .select('*')
        .order('created_at', { ascending: false })

      if (params.action_types?.length) {
        query = query.in('action_type', params.action_types)
      }

      if (params.entity_types?.length) {
        query = query.in('entity_type', params.entity_types)
      }

      if (params.actor_ids?.length) {
        query = query.in('actor_id', params.actor_ids)
      }

      if (params.start_date) {
        query = query.gte('created_at', params.start_date.toISOString())
      }

      if (params.end_date) {
        query = query.lte('created_at', params.end_date.toISOString())
      }

      if (params.limit) {
        query = query.limit(params.limit)
      }

      const { data, error } = await query

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error searching audit log:', error)
      throw error
    }
  }
} 