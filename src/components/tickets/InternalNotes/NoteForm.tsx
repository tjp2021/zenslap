import { useCallback, useState, useRef, useMemo, useEffect } from 'react'
import { Button, Textarea } from '@/components/ui'
import { cn } from '@/lib/utils'
import { MentionSuggestion } from './MentionSuggestion'
import { UserRole } from '@/lib/types'
import { extractMentions } from '@/lib/utils/mentions'
import getCaretCoordinates from 'textarea-caret'

interface User {
    id: string
    email: string
    role: UserRole
}

interface NoteFormProps {
    onSubmit: (content: string, mentions: string[]) => Promise<void>
    users: User[]
    currentUserRole: UserRole
    isLoading?: boolean
    className?: string
}

export function NoteForm({ onSubmit, users, currentUserRole, isLoading, className }: NoteFormProps) {
    const [content, setContent] = useState('')
    const [mentionQuery, setMentionQuery] = useState('')
    const [cursorPosition, setCursorPosition] = useState<{ top: number; left: number } | null>(null)
    const textareaRef = useRef<HTMLTextAreaElement>(null)

    // Ensure we have users before allowing mentions
    const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newContent = e.target.value
        setContent(newContent)

        // Don't process mentions if we don't have users
        if (!users?.length) {
            console.log('⚠️ No users available for mentions')
            return
        }

        const textarea = e.target
        const cursorPos = textarea.selectionStart
        const beforeCursor = newContent.slice(0, cursorPos)
        const matches = beforeCursor.match(/@(\w*)$/)

        if (matches) {
            const rect = textarea.getBoundingClientRect()
            const coords = getCaretCoordinates(textarea, cursorPos)
            
            // Adjust position based on scroll
            const top = rect.top + coords.top + window.scrollY
            const left = rect.left + coords.left + window.scrollX

            console.log('📝 Mention triggered:', { 
                query: matches[1],
                availableUsers: users.length,
                position: { top, left }
            })

            setCursorPosition({ top, left })
            setMentionQuery(matches[1])
        } else {
            setMentionQuery('')
            setCursorPosition(null)
        }
    }, [users])

    // Log when users become available
    useEffect(() => {
        if (users?.length) {
            console.log('👥 Users available for mentions:', users.length)
        }
    }, [users?.length])

    const handleMentionSelect = useCallback((user: User) => {
        const textarea = textareaRef.current
        if (!textarea) return

        const cursorPos = textarea.selectionStart
        const beforeMention = content.slice(0, cursorPos).replace(/@\w*$/, '')
        const afterMention = content.slice(cursorPos)
        
        const newContent = `${beforeMention}@${user.email} ${afterMention}`
        setContent(newContent)
        setMentionQuery('')
        setCursorPosition(null)

        // Focus and move cursor after mention
        textarea.focus()
        const newCursorPos = beforeMention.length + user.email.length + 2
        textarea.setSelectionRange(newCursorPos, newCursorPos)
    }, [content])

    const handleSubmit = useCallback(async (e: React.FormEvent) => {
        e.preventDefault()
        if (!content.trim() || isLoading) return

        try {
            const mentions = extractMentions(content)
            await onSubmit(content, mentions)
            setContent('')
        } catch (error) {
            console.error('Submit error:', error)
        }
    }, [content, isLoading, onSubmit])

    return (
        <form onSubmit={handleSubmit} className={cn('space-y-4 relative', className)}>
            <Textarea
                ref={textareaRef}
                value={content}
                onChange={handleChange}
                placeholder={users?.length ? "Add an internal note... Use @ to mention users" : "Loading users..."}
                className="min-h-[100px] resize-none"
                disabled={isLoading}
            />
            
            {mentionQuery !== '' && cursorPosition && users?.length > 0 && (
                <div
                    style={{
                        position: 'fixed',
                        top: cursorPosition.top + 24,
                        left: cursorPosition.left,
                        zIndex: 50
                    }}
                >
                    <MentionSuggestion
                        query={mentionQuery}
                        users={users}
                        currentUserRole={currentUserRole}
                        onSelect={handleMentionSelect}
                    />
                </div>
            )}

            <div className="flex justify-end">
                <Button type="submit" disabled={!content.trim() || isLoading}>
                    {isLoading ? 'Adding...' : 'Add Note'}
                </Button>
            </div>
        </form>
    )
} 