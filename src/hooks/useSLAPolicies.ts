import { useState, useCallback } from 'react'
import { SLAPolicy, CreateSLAPolicy, UpdateSLAPolicy } from '@/lib/types'
import { SLAPolicyService } from '@/lib/services/sla-policy.service'
import { useAuth } from './useAuth'
import { UserRole } from '@/lib/types'

export function useSLAPolicies() {
  const [policies, setPolicies] = useState<SLAPolicy[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const { user } = useAuth()
  const service = new SLAPolicyService()

  console.log('🔑 Auth Debug:', {
    userRole: user?.role,
    expectedRole: UserRole.ADMIN,
    isEqual: user?.role === UserRole.ADMIN,
    user
  })

  const isAdmin = user?.role === UserRole.ADMIN

  const loadPolicies = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = isAdmin 
        ? await service.getAllPolicies()
        : await service.getActivePolicies()
      setPolicies(data)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load SLA policies'))
    } finally {
      setLoading(false)
    }
  }, [isAdmin])

  const createPolicy = useCallback(async (policy: CreateSLAPolicy) => {
    if (!isAdmin) {
      console.error('🚫 Admin check failed:', {
        userRole: user?.role,
        expectedRole: UserRole.ADMIN,
        isEqual: user?.role === UserRole.ADMIN,
        user
      })
      throw new Error('Unauthorized')
    }
    try {
      const newPolicy = await service.createPolicy(policy)
      setPolicies(prev => [...prev, newPolicy])
      return newPolicy
    } catch (err) {
      throw err instanceof Error ? err : new Error('Failed to create SLA policy')
    }
  }, [isAdmin, user])

  const updatePolicy = useCallback(async (id: string, updates: UpdateSLAPolicy) => {
    if (!isAdmin) {
      console.error('🚫 Admin check failed:', {
        userRole: user?.role,
        expectedRole: UserRole.ADMIN,
        isEqual: user?.role === UserRole.ADMIN,
        user
      })
      throw new Error('Unauthorized')
    }
    try {
      const updatedPolicy = await service.updatePolicy(id, updates)
      setPolicies(prev => prev.map(p => p.id === id ? updatedPolicy : p))
      return updatedPolicy
    } catch (err) {
      throw err instanceof Error ? err : new Error('Failed to update SLA policy')
    }
  }, [isAdmin, user])

  const deletePolicy = useCallback(async (id: string) => {
    if (!isAdmin) {
      console.error('🚫 Admin check failed:', {
        userRole: user?.role,
        expectedRole: UserRole.ADMIN,
        isEqual: user?.role === UserRole.ADMIN,
        user
      })
      throw new Error('Unauthorized')
    }
    try {
      await service.deletePolicy(id)
      setPolicies(prev => prev.filter(p => p.id !== id))
    } catch (err) {
      throw err instanceof Error ? err : new Error('Failed to delete SLA policy')
    }
  }, [isAdmin, user])

  return {
    policies,
    loading,
    error,
    isAdmin,
    loadPolicies,
    createPolicy,
    updatePolicy,
    deletePolicy
  }
} 