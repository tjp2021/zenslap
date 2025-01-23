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
    // Defensive checks
    if (!users?.length) {
        console.log('⚠️ MentionSuggestion: No users provided')
        return null
    }

    if (!currentUserRole) {
        console.log('⚠️ MentionSuggestion: No user role provided')
        return null
    }

    // Only show for ADMIN and AGENT
    if (currentUserRole !== UserRole.ADMIN && currentUserRole !== UserRole.AGENT) {
        console.log('⚠️ MentionSuggestion: Unauthorized role:', currentUserRole)
        return null
    }

    // Filter users by role and query
    const filteredUsers = users.filter(user => 
        (user.role === UserRole.ADMIN || user.role === UserRole.AGENT) &&
        (!query || user.email.toLowerCase().includes(query.toLowerCase()))
    )

    console.log('👥 MentionSuggestion filtered:', {
        total: users.length,
        filtered: filteredUsers.length,
        query
    })

    if (filteredUsers.length === 0) return null

    return (
        <div className="border rounded-lg shadow-md bg-white min-w-[200px]">
            <div className="p-2 space-y-1 max-h-[200px] overflow-y-auto">
                {filteredUsers.map(user => (
                    <button
                        key={user.id}
                        onClick={() => onSelect(user)}
                        className="w-full text-left px-3 py-2 rounded hover:bg-blue-50 focus:bg-blue-50 focus:outline-none"
                    >
                        <div className="flex flex-col">
                            <span className="text-sm font-medium">{user.email}</span>
                            <span className="text-xs text-gray-500 capitalize">{user.role.toLowerCase()}</span>
                        </div>
                    </button>
                ))}
            </div>
        </div>
    )
}) 