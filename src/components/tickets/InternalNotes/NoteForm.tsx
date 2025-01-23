import { useCallback, useState, useRef, useMemo, useEffect } from 'react'
import { Button, Textarea } from '@/components/ui'
import { cn } from '@/lib/utils'
import { MentionSuggestion } from './MentionSuggestion'
import { UserRole } from '@/lib/types'
import { extractMentions, validateMentions } from '@/lib/utils/mentions'
import getCaretCoordinates from 'textarea-caret'
import { createPortal } from 'react-dom'

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

    // Debug render conditions
    useEffect(() => {
        console.log('🔍 [@DEBUG] Mention state:', {
            hasQuery: !!mentionQuery,
            query: mentionQuery,
            hasPosition: !!cursorPosition,
            position: cursorPosition,
            hasUsers: !!users?.length,
            userCount: users?.length,
            currentUserRole
        })
    }, [mentionQuery, cursorPosition, users, currentUserRole])

    const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newContent = e.target.value
        setContent(newContent)

        const textarea = e.target
        const cursorPos = textarea.selectionStart
        const beforeCursor = newContent.slice(0, cursorPos)
        
        // Match @ followed by any valid email characters
        const matches = beforeCursor.match(/@([\w.-]*)$/)

        console.log('🔍 [@DEBUG] Content change:', {
            content: beforeCursor.slice(-20),
            matches: matches ? matches[1] : null,
            cursorPos
        })

        if (matches) {
            const rect = textarea.getBoundingClientRect()
            const coords = getCaretCoordinates(textarea, cursorPos)
            
            const top = rect.top + coords.top + window.scrollY
            const left = rect.left + coords.left + window.scrollX

            setMentionQuery(matches[1])
            setCursorPosition({ top, left })
        } else {
            setMentionQuery('')
            setCursorPosition(null)
        }
    }, [])

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
            const emailMentions = extractMentions(content)
            const userIdMentions = validateMentions(emailMentions, users)
            await onSubmit(content, userIdMentions)
            setContent('')
        } catch (error) {
            console.error('Submit error:', error)
        }
    }, [content, isLoading, onSubmit, users])

    // Render dropdown in a portal
    const renderDropdown = () => {
        if (!mentionQuery || !cursorPosition || !users?.length) return null

        return createPortal(
            <div
                style={{
                    position: 'absolute',
                    top: `${cursorPosition.top + 20}px`,
                    left: `${cursorPosition.left}px`,
                    zIndex: 9999
                }}
                className="mention-dropdown"
            >
                <MentionSuggestion
                    query={mentionQuery}
                    users={users}
                    currentUserRole={currentUserRole}
                    onSelect={handleMentionSelect}
                />
            </div>,
            document.body
        )
    }

    return (
        <>
            <form onSubmit={handleSubmit} className={cn('space-y-4 relative', className)}>
                <Textarea
                    ref={textareaRef}
                    value={content}
                    onChange={handleChange}
                    placeholder="Add an internal note... Use @ to mention users"
                    className="min-h-[100px] resize-none"
                    disabled={isLoading}
                />
                
                <div className="flex justify-end">
                    <Button type="submit" disabled={!content.trim() || isLoading}>
                        {isLoading ? 'Adding...' : 'Add Note'}
                    </Button>
                </div>
            </form>
            {renderDropdown()}
        </>
    )
} 