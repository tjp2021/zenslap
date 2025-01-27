import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { SLAPolicy, CreateSLAPolicy, UpdateSLAPolicy } from '@/lib/types'

export class SLAPolicyService {
  private supabase = createClientComponentClient()

  async getActivePolicies(): Promise<SLAPolicy[]> {
    const { data, error } = await this.supabase
      .from('sla_policies')
      .select('*')
      .eq('is_active', true)
      .order('priority')

    if (error) throw error
    return data
  }

  async getAllPolicies(): Promise<SLAPolicy[]> {
    const { data, error } = await this.supabase
      .from('sla_policies')
      .select('*')
      .order('priority')

    if (error) throw error
    return data
  }

  async createPolicy(policy: CreateSLAPolicy): Promise<SLAPolicy> {
    const { data, error } = await this.supabase
      .from('sla_policies')
      .insert(policy)
      .select()
      .single()

    if (error) throw error
    return data
  }

  async updatePolicy(id: string, updates: UpdateSLAPolicy): Promise<SLAPolicy> {
    const { data, error } = await this.supabase
      .from('sla_policies')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  }

  async deletePolicy(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('sla_policies')
      .delete()
      .eq('id', id)

    if (error) throw error
  }
} 