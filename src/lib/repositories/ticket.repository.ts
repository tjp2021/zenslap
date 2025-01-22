import { SupabaseClient } from '@supabase/supabase-js'
import type { Ticket, CreateTicketDTO, UpdateTicketDTO } from '@/lib/types'
import type { TicketActivity, ActivityType, ActivityContent } from '@/lib/types/activities'
import { ApiError } from '@/lib/utils/error-handling'

// Base repository interface
export interface ITicketRepository {
  findAll(): Promise<Ticket[]>
  findById(id: string): Promise<Ticket | null>
  findByAssignee(userId: string): Promise<Ticket[]>
  create(data: CreateTicketDTO): Promise<Ticket>
  update(id: string, data: UpdateTicketDTO): Promise<Ticket>
  delete(id: string): Promise<void>
  getActivities(ticketId: string): Promise<TicketActivity[]>
  addActivity(ticketId: string, actorId: string, type: ActivityType, content: ActivityContent['content']): Promise<TicketActivity>
  getWeeklyStatistics(): Promise<{ good: number; bad: number; solved: number }>
}

// Supabase implementation
export class SupabaseTicketRepository implements ITicketRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async findAll(): Promise<Ticket[]> {
    const { data, error } = await this.supabase
      .from('tickets')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw new ApiError('Failed to fetch tickets', error.code, error)
    return data || []
  }

  async findById(id: string): Promise<Ticket | null> {
    const { data, error } = await this.supabase
      .from('tickets')
      .select('*')
      .eq('id', id)
      .single()

    if (error && error.code !== 'PGRST116') { // Ignore not found error
      throw new ApiError('Failed to fetch ticket', error.code, error)
    }
    return data
  }

  async findByAssignee(userId: string): Promise<Ticket[]> {
    const { data, error } = await this.supabase
      .from('tickets')
      .select('*')
      .eq('assignee', userId)
      .order('created_at', { ascending: false })

    if (error) throw new ApiError('Failed to fetch assigned tickets', error.code, error)
    return data || []
  }

  async create(data: CreateTicketDTO): Promise<Ticket> {
    const { data: ticket, error } = await this.supabase
      .from('tickets')
      .insert(data)
      .select()
      .single()

    if (error) throw new ApiError('Failed to create ticket', error.code, error)
    if (!ticket) throw new ApiError('Failed to create ticket', 'CREATION_FAILED')
    return ticket
  }

  async update(id: string, data: UpdateTicketDTO): Promise<Ticket> {
    const { data: ticket, error } = await this.supabase
      .from('tickets')
      .update(data)
      .eq('id', id)
      .select()
      .single()

    if (error) throw new ApiError('Failed to update ticket', error.code, error)
    if (!ticket) throw new ApiError('Ticket not found', 'NOT_FOUND')
    return ticket
  }

  async delete(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('tickets')
      .delete()
      .eq('id', id)

    if (error) throw new ApiError('Failed to delete ticket', error.code, error)
  }

  async getActivities(ticketId: string): Promise<TicketActivity[]> {
    const { data, error } = await this.supabase
      .from('ticket_activities')
      .select('*')
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: false })

    if (error) throw new ApiError('Failed to fetch activities', error.code, error)
    return data || []
  }

  async addActivity(
    ticketId: string,
    actorId: string,
    type: ActivityType,
    content: ActivityContent['content']
  ): Promise<TicketActivity> {
    const { data, error } = await this.supabase
      .from('ticket_activities')
      .insert({
        ticket_id: ticketId,
        actor_id: actorId,
        activity_type: type,
        content
      })
      .select()
      .single()

    if (error) throw new ApiError('Failed to add activity', error.code, error)
    if (!data) throw new ApiError('Failed to add activity', 'CREATION_FAILED')
    return data
  }

  async getWeeklyStatistics(): Promise<{ good: number; bad: number; solved: number }> {
    const startOfWeek = new Date()
    startOfWeek.setHours(0, 0, 0, 0)
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay())

    const { data, error } = await this.supabase
      .from('tickets')
      .select('created_at, updated_at')
      .eq('status', 'closed')
      .gte('updated_at', startOfWeek.toISOString())

    if (error) throw new ApiError('Failed to fetch statistics', error.code, error)

    const SLA_TIME = 24 * 60 * 60 * 1000 // 24 hours in milliseconds
    const stats = (data || []).reduce(
      (acc, ticket) => {
        const resolutionTime = new Date(ticket.updated_at).getTime() - new Date(ticket.created_at).getTime()
        if (resolutionTime <= SLA_TIME) {
          acc.good++
        } else {
          acc.bad++
        }
        acc.solved++
        return acc
      },
      { good: 0, bad: 0, solved: 0 }
    )

    return stats
  }
} 