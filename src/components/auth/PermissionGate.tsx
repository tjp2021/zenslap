'use client'

import { type ReactNode } from 'react'
import { useRoleAccess } from '@/hooks/useRoleAccess'
import { UserRole } from '@/lib/types'
import { Skeleton } from '@/components/ui/skeleton'

interface PermissionGateProps {
  children: ReactNode
  fallback?: ReactNode
  loadingFallback?: ReactNode
  requiredRoles?: UserRole | UserRole[]
}

export function PermissionGate({
  children,
  fallback = null,
  loadingFallback = <Skeleton className="h-8 w-full" />,
  requiredRoles
}: PermissionGateProps) {
  const { hasRole, isLoading } = useRoleAccess()

  if (isLoading) {
    return <>{loadingFallback}</>
  }

  if (!requiredRoles) {
    return <>{children}</>
  }

  if (!hasRole(requiredRoles)) {
    return <>{fallback}</>
  }

  return <>{children}</>
}

// Convenience components for common use cases
export function AdminOnly({ children, fallback, loadingFallback }: Omit<PermissionGateProps, 'requiredRoles'>) {
  return (
    <PermissionGate
      requiredRoles={UserRole.ADMIN}
      fallback={fallback}
      loadingFallback={loadingFallback}
    >
      {children}
    </PermissionGate>
  )
}

export function AgentAndAbove({ children, fallback, loadingFallback }: Omit<PermissionGateProps, 'requiredRoles'>) {
  return (
    <PermissionGate
      requiredRoles={[UserRole.ADMIN, UserRole.AGENT]}
      fallback={fallback}
      loadingFallback={loadingFallback}
    >
      {children}
    </PermissionGate>
  )
} 