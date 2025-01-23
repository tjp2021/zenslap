import { memo } from 'react'
import { cn } from '@/lib/utils'
import { UserRole } from '@/lib/types'

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
}

export const MentionSuggestion = memo(function MentionSuggestion({ 
    query, 
    users, 
    currentUserRole,
    onSelect
}: MentionSuggestionProps) {
    console.log('🎯 [@DEBUG] MentionSuggestion input:', {
        query,
        usersCount: users.length,
        users: users.map(u => ({ email: u.email, role: u.role }))
    })

    // Filter users by role first
    const roleFilteredUsers = users.filter(user => {
        // Convert roles to uppercase for comparison
        const userRole = user.role.toUpperCase()
        return userRole === 'ADMIN' || userRole === 'AGENT'
    })

    console.log('👥 [@DEBUG] Role filtered:', {
        before: users.length,
        after: roleFilteredUsers.length,
        roles: roleFilteredUsers.map(u => u.role)
    })

    // Then filter by email if we have a query
    const filteredUsers = roleFilteredUsers.filter(user => {
        const normalizedQuery = query.toLowerCase()
        const normalizedEmail = user.email.toLowerCase()
        
        // Show all users if query is empty or just @
        if (!query || query === '@') return true
        
        // Simple substring match
        return normalizedEmail.includes(normalizedQuery)
    })

    console.log('✨ [@DEBUG] Email filtered:', {
        before: roleFilteredUsers.length,
        after: filteredUsers.length,
        query,
        matches: filteredUsers.map(u => u.email)
    })

    // Always render the container, even if no matches
    return (
        <div className="border rounded-lg shadow-lg bg-white min-w-[200px] relative" style={{ backgroundColor: 'white' }}>
            <div className="p-2 space-y-1 max-h-[200px] overflow-y-auto">
                {filteredUsers.length > 0 ? (
                    filteredUsers.map(user => (
                        <button
                            key={user.id}
                            onClick={() => onSelect(user)}
                            className="w-full text-left px-3 py-2 rounded hover:bg-blue-50 focus:bg-blue-50 focus:outline-none"
                            style={{ display: 'block' }}
                        >
                            <div className="flex flex-col">
                                <span className="text-sm font-medium text-black">{user.email}</span>
                                <span className="text-xs text-gray-500 capitalize">{user.role.toLowerCase()}</span>
                            </div>
                        </button>
                    ))
                ) : (
                    <div className="px-3 py-2 text-sm text-gray-500">
                        No matching users
                    </div>
                )}
            </div>
        </div>
    )
}) 