'use client'

import { Command } from '@/components/ui/command'
import { Badge } from '@/components/ui/badge'
import { UserRole } from '@/lib/types'
import { cn } from '@/lib/utils'

interface StaffUser {
  id: string
  email: string
  role: UserRole
}

interface MentionListProps {
  suggestions: StaffUser[]
  isLoading: boolean
  selectedIndex: number
  onSelect: (user: StaffUser) => void
  className?: string
}

export function MentionList({
  suggestions,
  isLoading,
  selectedIndex,
  onSelect,
  className
}: MentionListProps) {
  if (isLoading) {
    return (
      <Command className={cn('mention-list', className)}>
        <div className="p-4 text-sm text-muted-foreground text-center">
          Loading suggestions...
        </div>
      </Command>
    )
  }

  if (suggestions.length === 0) {
    return (
      <Command className={cn('mention-list', className)}>
        <div className="p-4 text-sm text-muted-foreground text-center">
          No matching users found
        </div>
      </Command>
    )
  }

  return (
    <Command className={cn('mention-list', className)}>
      <div
        role="listbox"
        aria-label="User mentions"
        className="max-h-[200px] overflow-y-auto"
      >
        {suggestions.map((user, index) => (
          <div
            key={user.id}
            role="option"
            aria-selected={index === selectedIndex}
            className={cn(
              'flex items-center gap-2 px-4 py-2 text-sm cursor-pointer',
              index === selectedIndex ? 'bg-accent' : 'hover:bg-accent/50'
            )}
            onClick={() => onSelect(user)}
          >
            <span className="flex-1">{user.email}</span>
            <Badge variant="secondary" className="text-xs">
              {user.role}
            </Badge>
          </div>
        ))}
      </div>
    </Command>
  )
} 