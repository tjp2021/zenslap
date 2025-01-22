'use client'

import { type ComponentType } from 'react'
import { RoleErrorBoundary } from './RoleErrorBoundary'

interface WithRoleProtectionProps {
  fallback?: React.ReactNode
}

export function withRoleProtection<P extends object>(
  WrappedComponent: ComponentType<P>,
  { fallback }: WithRoleProtectionProps = {}
) {
  function WithRoleProtection(props: P) {
    return (
      <RoleErrorBoundary fallback={fallback}>
        <WrappedComponent {...props} />
      </RoleErrorBoundary>
    )
  }

  // Set display name for debugging
  WithRoleProtection.displayName = `withRoleProtection(${
    WrappedComponent.displayName || WrappedComponent.name || 'Component'
  })`

  return WithRoleProtection
} 