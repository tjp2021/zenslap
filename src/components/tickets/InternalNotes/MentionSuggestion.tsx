import { useState, useEffect, useCallback } from 'react'
import { UserRole } from '@/lib/types'
import { filterMentionableUsers } from '@/lib/utils/mentions'
import { Command } from '@/components/ui/command'

interface User {
    id: string
    email: string
    role: UserRole
}

interface MentionSuggestionProps {
    query: string
    users: User[]
    onSelect: (user: User) => void
    currentUserRole: UserRole
    className?: string
}

export function MentionSuggestion({ 
    query, 
    users, 
    onSelect, 
    currentUserRole,
    className 
}: MentionSuggestionProps) {
    if (currentUserRole !== UserRole.ADMIN && currentUserRole !== UserRole.AGENT) {
        return null
    }

    const [filteredUsers, setFilteredUsers] = useState<User[]>([])

    useEffect(() => {
        // Filter mentionable users and then filter by query
        const mentionable = filterMentionableUsers(users)
        const filtered = mentionable.filter(user =>
            user.email.toLowerCase().includes(query.toLowerCase())
        )
        setFilteredUsers(filtered)
    }, [query, users])

    const handleSelect = useCallback((user: User) => {
        onSelect(user)
    }, [onSelect])

    if (!query || filteredUsers.length === 0) {
        return null
    }

    return (
        <Command className={className}>
            <div className="p-2 text-sm text-muted-foreground">
                Mentionable users
            </div>
            <div className="max-h-[200px] overflow-y-auto">
                {filteredUsers.map(user => (
                    <button
                        key={user.id}
                        className="w-full px-4 py-2 text-left hover:bg-accent flex items-center gap-2"
                        onClick={() => handleSelect(user)}
                    >
                        <span className="text-sm font-medium">{user.email}</span>
                        <span className="text-xs text-muted-foreground capitalize">
                            {user.role.toLowerCase()}
                        </span>
                    </button>
                ))}
            </div>
        </Command>
    )
} 