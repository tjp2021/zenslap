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
    console.log('🔍 [@DEBUG] Extracting mentions from:', content)
    
    // Match @email.com pattern
    const mentionRegex = /@([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/g
    const matches = content.match(mentionRegex)
    
    console.log('✨ [@DEBUG] Mention matches:', {
        pattern: mentionRegex.source,
        matches,
        rawMatches: matches ? [...matches] : []
    })
    
    if (!matches) return []
    
    // Remove @ symbol from matches
    const result = matches.map(match => match.slice(1))
    
    console.log('✅ [@DEBUG] Extracted mentions:', result)
    return result
}

/**
 * Filter users to only admin and agent roles
 * @param users Array of users to filter
 * @returns Array of users with admin or agent roles
 */
export function filterMentionableUsers(users: MentionUser[]): MentionUser[] {
    console.log('🔍 [@DEBUG] Filtering users:', {
        total: users?.length,
        roles: users?.map(u => u.role)
    })
    
    const filtered = users.filter(user => 
        user.role === UserRole.ADMIN || user.role === UserRole.AGENT
    )
    
    console.log('✅ [@DEBUG] Filtered users:', {
        before: users.length,
        after: filtered.length,
        roles: filtered.map(u => u.role)
    })
    
    return filtered
}

/**
 * Validate mentions against list of mentionable users
 * @param mentions Array of email addresses to validate
 * @param users Array of valid users
 * @returns Array of valid user IDs
 */
export function validateMentions(mentions: string[], users: MentionUser[]): string[] {
    console.log('🔍 [@DEBUG] Validating mentions:', {
        mentions,
        totalUsers: users.length
    })
    
    const mentionableUsers = filterMentionableUsers(users)
    const emailToId = new Map(mentionableUsers.map(user => [user.email, user.id]))
    
    console.log('📝 [@DEBUG] Email to ID mapping:', {
        totalMappings: emailToId.size,
        mappings: Object.fromEntries(emailToId)
    })
    
    const validIds = mentions
        .map(email => {
            const id = emailToId.get(email)
            console.log('🔍 [@DEBUG] Validating mention:', { email, foundId: id })
            return id
        })
        .filter((id): id is string => id !== undefined)
    
    console.log('✅ [@DEBUG] Valid mention IDs:', validIds)
    return validIds
}

/**
 * Format content with mention highlights
 * @param content The text content with mentions
 * @param users Map of user IDs to user data
 * @returns Content with mentions wrapped in highlight spans
 */
export function formatMentions(content: string, users: Record<string, MentionUser>): string {
    console.log('🔍 formatMentions - Content:', content)
    console.log('🔍 formatMentions - Users:', users)
    const formatted = content.replace(
        /@([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/g,
        (match, email) => {
            const user = Object.values(users).find(u => u.email === email)
            console.log('📝 formatMentions - Match:', match, 'Email:', email, 'Found user:', user)
            if (!user) return match
            return `<span class="mention" data-user-id="${user.id}">${match}</span>`
        }
    )
    console.log('✅ formatMentions - Formatted content:', formatted)
    return formatted
} 