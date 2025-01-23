import { UserRole } from '@/lib/types'

interface MentionUser {
    id: string
    email: string
    role: UserRole
}

/**
 * Extract mentions from text content
 * @param content The text content to parse
 * @returns Array of mention strings (without the @ symbol)
 */
export function extractMentions(content: string): string[] {
    const mentionRegex = /@([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/g
    const matches = content.match(mentionRegex)
    if (!matches) return []
    return matches.map(match => match.slice(1)) // Remove @ symbol
}

/**
 * Filter users to only admin and agent roles
 * @param users Array of users to filter
 * @returns Array of users with admin or agent roles
 */
export function filterMentionableUsers(users: MentionUser[]): MentionUser[] {
    return users.filter(user => 
        user.role === UserRole.ADMIN || user.role === UserRole.AGENT
    )
}

/**
 * Validate mentions against list of mentionable users
 * @param mentions Array of email addresses to validate
 * @param users Array of valid users
 * @returns Array of valid user IDs
 */
export function validateMentions(mentions: string[], users: MentionUser[]): string[] {
    const mentionableUsers = filterMentionableUsers(users)
    const emailToId = new Map(mentionableUsers.map(user => [user.email, user.id]))
    
    return mentions
        .map(email => emailToId.get(email))
        .filter((id): id is string => id !== undefined)
}

/**
 * Format content with mention highlights
 * @param content The text content with mentions
 * @param users Map of user IDs to user data
 * @returns Content with mentions wrapped in highlight spans
 */
export function formatMentions(content: string, users: Record<string, MentionUser>): string {
    return content.replace(
        /@([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/g,
        (match, email) => {
            const user = Object.values(users).find(u => u.email === email)
            if (!user) return match
            return `<span class="mention" data-user-id="${user.id}">${match}</span>`
        }
    )
} 