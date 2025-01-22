import { createContextAwareClient } from '@/lib/supabase/server'
import { SupabaseTicketRepository, type ITicketRepository } from './ticket.repository'

// Repository factory for dependency injection
export class RepositoryFactory {
  private static ticketRepository: ITicketRepository | null = null

  static async getTicketRepository(): Promise<ITicketRepository> {
    if (!this.ticketRepository) {
      const supabase = await createContextAwareClient()
      this.ticketRepository = new SupabaseTicketRepository(supabase)
    }
    return this.ticketRepository
  }
} 