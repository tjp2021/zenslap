import { Ticket } from "@/lib/types"

export class SLACalculator {
  getSLADeadline(ticket: Ticket): Date {
    const created = new Date(ticket.created_at)
    const priority = ticket.priority || 'medium'
    
    // SLA hours based on priority
    const slaHours = {
      high: 2,
      medium: 4,
      low: 8
    }[priority] || 4

    return new Date(created.getTime() + slaHours * 60 * 60 * 1000)
  }
} 