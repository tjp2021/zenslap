import { useCallback, useEffect, useState } from 'react'
import { Command } from '@/components/ui'
import { cn } from '@/lib/utils'
import { UserRole } from '@/lib/types'
import { filterMentionableUsers } from '@/lib/utils/mentions'

interface User {
    id: string
    email: string
    role: UserRole
}

interface MentionSuggestionProps {
    query: string
    users: User[]
    currentUserRole: UserRole
    onSelect: (user: User) => void
    className?: string
}

export function MentionSuggestion({ 
    query, 
    users, 
    currentUserRole,
    onSelect,
    className 
}: MentionSuggestionProps) {
    console.log('🚀 MentionSuggestion - Component Initializing', {
        hasQuery: Boolean(query),
        hasUsers: Boolean(users?.length),
        currentUserRole
    })

    // Only show suggestions for ADMIN and AGENT users
    if (currentUserRole !== UserRole.ADMIN && currentUserRole !== UserRole.AGENT) {
        console.log('🚫 MentionSuggestion - User not authorized:', currentUserRole)
        return null
    }

    // Filter users based on query and roles
    const mentionableUsers = filterMentionableUsers(users)
    console.log('👥 MentionSuggestion - Mentionable users:', mentionableUsers.length)

    const filteredUsers = mentionableUsers.filter(user => 
        user.email.toLowerCase().includes(query.toLowerCase())
    )
    console.log('🔎 MentionSuggestion - Filtered users:', filteredUsers.length)

    const handleSelect = useCallback((user: User) => {
        console.log('✨ MentionSuggestion - User selected:', user)
        onSelect(user)
    }, [onSelect])

    // Don't show if no query or no filtered users
    if (!query || filteredUsers.length === 0) {
        console.log('🚫 MentionSuggestion - No query or no filtered users')
        return null
    }

    console.log('🎯 MentionSuggestion - Rendering suggestion list')
    return (
        <Command className={cn('border rounded-lg shadow-md bg-white', className)}>
            <div className="p-2 space-y-1">
                {filteredUsers.map(user => (
                    <button
                        key={user.id}
                        onClick={() => handleSelect(user)}
                        className="w-full text-left px-2 py-1 rounded hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
                    >
                        <div className="text-sm font-medium">{user.email}</div>
                        <div className="text-xs text-gray-500">{user.role}</div>
                    </button>
                ))}
            </div>
        </Command>
    )
} 