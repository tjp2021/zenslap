'use client'

import { cn } from '@/lib/utils'

interface MentionListProps {
  suggestions: Array<{
    id: string
    email: string
    role: string
  }>
  isLoading: boolean
  onSelect: (user: { id: string; email: string; role: string }) => void
  className?: string
}

export function MentionList({
  suggestions,
  isLoading,
  onSelect,
  className
}: MentionListProps) {
  if (isLoading) {
    return (
      <div className={cn('bg-white p-2 rounded-md', className)}>
        <div className="flex items-center justify-center p-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900" />
        </div>
      </div>
    )
  }

  if (!suggestions.length) {
    return (
      <div className={cn('bg-white p-2 rounded-md', className)}>
        <div className="p-2 text-sm text-gray-500">
          No users found
        </div>
      </div>
    )
  }

  return (
    <div 
      className={cn('bg-white rounded-md overflow-hidden', className)}
      role="listbox"
      aria-label="User mentions"
    >
      {suggestions.map((user, index) => (
        <button
          key={user.id}
          role="option"
          className={cn(
            'w-full text-left px-4 py-2 text-sm hover:bg-gray-100 focus:bg-gray-100 focus:outline-none',
            'flex items-center justify-between gap-2'
          )}
          onClick={() => onSelect(user)}
        >
          <span>{user.email}</span>
          <span className="text-xs text-gray-500 capitalize">{user.role}</span>
        </button>
      ))}
    </div>
  )
} 