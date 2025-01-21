import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { 
  Workflow, 
  WorkflowCondition, 
  WorkflowAction,
  WorkflowTrigger 
} from '@/lib/types/integrations'
import { WebhookService } from './webhook.service'
import { AIService } from './ai.service'

export class WorkflowService {
  private static instance: WorkflowService
  private supabase = createClientComponentClient()
  private webhookService = WebhookService.getInstance()
  private workflows: Map<string, Workflow> = new Map()

  private constructor() {
    // Private constructor for singleton pattern
  }

  public static getInstance(): WorkflowService {
    if (!WorkflowService.instance) {
      WorkflowService.instance = new WorkflowService()
    }
    return WorkflowService.instance
  }

  // Workflow Management
  async createWorkflow(workflow: Omit<Workflow, 'id' | 'createdAt' | 'updatedAt'>): Promise<Workflow> {
    const { data, error } = await this.supabase
      .from('workflows')
      .insert([{
        ...workflow,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
      .select()
      .single()

    if (error) throw error
    const newWorkflow = data as Workflow
    this.workflows.set(newWorkflow.id, newWorkflow)
    return newWorkflow
  }

  async getWorkflow(id: string): Promise<Workflow | null> {
    if (this.workflows.has(id)) {
      return this.workflows.get(id)!
    }

    const { data, error } = await this.supabase
      .from('workflows')
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw error
    if (!data) return null

    const workflow = data as Workflow
    this.workflows.set(workflow.id, workflow)
    return workflow
  }

  // Workflow Execution
  async executeWorkflow(workflowId: string, context: Record<string, any>): Promise<void> {
    const workflow = await this.getWorkflow(workflowId)
    if (!workflow || !workflow.isActive) return

    // Check if trigger conditions are met
    if (!this.evaluateTrigger(workflow.trigger, context)) {
      return
    }

    // Evaluate conditions
    const conditionsMet = workflow.conditions.every(condition => 
      this.evaluateCondition(condition, context)
    )

    if (!conditionsMet) return

    // Execute actions
    await this.executeActions(workflow.actions, context)
  }

  private evaluateTrigger(trigger: WorkflowTrigger, context: Record<string, any>): boolean {
    switch (trigger.type) {
      case 'event':
        return context.event === trigger.config.eventName
      case 'schedule':
        // Implement schedule-based triggers
        return this.evaluateSchedule(trigger.config, context)
      case 'condition':
        return this.evaluateCondition(trigger.config.condition, context)
      default:
        return false
    }
  }

  private evaluateSchedule(config: any, context: Record<string, any>): boolean {
    // Implement schedule evaluation logic
    // This could use cron expressions or simple interval checks
    return false
  }

  private evaluateCondition(condition: WorkflowCondition, context: Record<string, any>): boolean {
    const value = this.getValueFromPath(context, condition.field)

    switch (condition.operator) {
      case 'equals':
        return value === condition.value
      case 'contains':
        return value?.includes(condition.value)
      case 'gt':
        return value > condition.value
      case 'lt':
        return value < condition.value
      case 'in':
        return Array.isArray(condition.value) && condition.value.includes(value)
      case 'exists':
        return value !== undefined && value !== null
      default:
        return false
    }
  }

  private async executeActions(actions: WorkflowAction[], context: Record<string, any>): Promise<void> {
    for (const action of actions) {
      try {
        await this.executeAction(action, context)
      } catch (error) {
        console.error(`Failed to execute action: ${action.type}`, error)
        // Implement error handling strategy (retry, skip, or fail workflow)
      }
    }
  }

  private async executeAction(action: WorkflowAction, context: Record<string, any>): Promise<void> {
    switch (action.type) {
      case 'update_ticket':
        await this.updateTicket(action.config, context)
        break
      case 'send_notification':
        await this.sendNotification(action.config, context)
        break
      case 'trigger_webhook':
        await this.webhookService.triggerWebhook(
          action.config.event,
          { ...context, workflow: action.config }
        )
        break
      case 'run_ai_analysis':
        await this.runAIAnalysis(action.config, context)
        break
    }
  }

  private async updateTicket(config: any, context: Record<string, any>): Promise<void> {
    const { data, error } = await this.supabase
      .from('tickets')
      .update(config.updates)
      .eq('id', context.ticketId)

    if (error) throw error
  }

  private async sendNotification(config: any, context: Record<string, any>): Promise<void> {
    // Implement notification logic (email, push, etc.)
  }

  private async runAIAnalysis(config: any, context: Record<string, any>): Promise<void> {
    // Implement AI analysis logic
  }

  private getValueFromPath(obj: any, path: string): any {
    return path.split('.').reduce((acc, part) => acc?.[part], obj)
  }
} 