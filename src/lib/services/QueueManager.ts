import { supabase } from '@/lib/supabase/client'
import type { Ticket } from '@/lib/types'

export interface QueueRule {
  priority: string
  maxAssignedTickets: number
  slaMinutes: number
}

interface Agent {
  id: string
}

interface AgentWorkload {
  agentId: string
  workload: number
}

const DEFAULT_QUEUE_RULES: Record<string, QueueRule> = {
  high: {
    priority: 'high',
    maxAssignedTickets: 3,
    slaMinutes: 60
  },
  medium: {
    priority: 'medium',
    maxAssignedTickets: 5,
    slaMinutes: 120
  },
  low: {
    priority: 'low',
    maxAssignedTickets: 8,
    slaMinutes: 240
  }
}

export class QueueManager {
  private rules: Record<string, QueueRule>

  constructor(rules: Record<string, QueueRule> = DEFAULT_QUEUE_RULES) {
    this.rules = rules
  }

  async getAgentWorkload(agentId: string): Promise<number> {
    const { count } = await supabase
      .from('tickets')
      .select('*', { count: 'exact', head: true })
      .eq('assignee', agentId)
      .eq('status', 'open')

    return count || 0
  }

  async findAvailableAgent(priority: string): Promise<string | null> {
    const { data: agents } = await supabase
      .from('users')
      .select('id')
      .eq('role', 'agent')

    if (!agents?.length) return null

    // Get workload for each agent
    const workloads = await Promise.all(
      agents.map(async (agent: Agent) => ({
        agentId: agent.id,
        workload: await this.getAgentWorkload(agent.id)
      }))
    )

    // Find agent with lowest workload that's under the max for this priority
    const maxTickets = this.rules[priority]?.maxAssignedTickets || DEFAULT_QUEUE_RULES.low.maxAssignedTickets
    const availableAgent = workloads
      .filter(({ workload }: AgentWorkload) => workload < maxTickets)
      .sort((a: AgentWorkload, b: AgentWorkload) => a.workload - b.workload)[0]

    return availableAgent?.agentId || null
  }

  async autoAssignTicket(ticketId: string): Promise<void> {
    const { data: ticket } = await supabase
      .from('tickets')
      .select('*')
      .eq('id', ticketId)
      .single()

    if (!ticket || ticket.assignee) return

    const availableAgent = await this.findAvailableAgent(ticket.priority)
    if (!availableAgent) return

    await supabase
      .from('tickets')
      .update({ assignee: availableAgent })
      .eq('id', ticketId)
  }

  async checkSLAViolations(): Promise<void> {
    const { data: tickets } = await supabase
      .from('tickets')
      .select('*')
      .eq('status', 'open')

    if (!tickets) return

    const now = new Date()
    const violations = tickets.filter(ticket => {
      const createdAt = new Date(ticket.created_at)
      const slaMinutes = this.rules[ticket.priority]?.slaMinutes || DEFAULT_QUEUE_RULES.low.slaMinutes
      const slaDeadline = new Date(createdAt.getTime() + slaMinutes * 60000)
      return now > slaDeadline
    })

    // Update violated tickets
    for (const ticket of violations) {
      await supabase
        .from('tickets')
        .update({ 
          priority: 'high',
          metadata: {
            ...ticket.metadata,
            sla_violated: true,
            violation_time: now.toISOString()
          }
        })
        .eq('id', ticket.id)
    }
  }

  // Utility method to get SLA deadline for a ticket
  getSLADeadline(ticket: Ticket): Date {
    const createdAt = new Date(ticket.created_at)
    const slaMinutes = this.rules[ticket.priority]?.slaMinutes || DEFAULT_QUEUE_RULES.low.slaMinutes
    return new Date(createdAt.getTime() + slaMinutes * 60000)
  }
} 