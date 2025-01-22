'use client'

import { type FormEvent, type ReactNode } from 'react'
import { useRoleAccess } from '@/hooks/useRoleAccess'
import { UserRole } from '@/lib/types'
import { cn } from '@/lib/utils'

interface ProtectedFormProps {
  children: ReactNode
  onSubmit: (e: FormEvent<HTMLFormElement>) => Promise<void> | void
  requiredRoles: UserRole | UserRole[]
  className?: string
  disabledMessage?: string
}

export function ProtectedForm({
  children,
  onSubmit,
  requiredRoles,
  className,
  disabledMessage = "You don't have permission to perform this action",
}: ProtectedFormProps) {
  const { hasRole, isLoading } = useRoleAccess()
  const isAllowed = !isLoading && hasRole(requiredRoles)

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!isAllowed) return

    await onSubmit(e)
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={cn(
        'relative',
        !isAllowed && 'opacity-60 cursor-not-allowed',
        className
      )}
    >
      <fieldset disabled={!isAllowed} className="space-y-4">
        {children}
      </fieldset>
      
      {!isAllowed && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/50">
          <p className="text-sm text-muted-foreground">{disabledMessage}</p>
        </div>
      )}
    </form>
  )
} 