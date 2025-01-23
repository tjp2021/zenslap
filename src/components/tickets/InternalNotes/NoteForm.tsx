import { useCallback, useState, useRef } from 'react'
import { Button, Textarea } from '@/components/ui'
import { cn } from '@/lib/utils'
import { MentionSuggestion } from './MentionSuggestion'
import { UserRole } from '@/lib/types'
import { extractMentions } from '@/lib/utils/mentions'

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

    const handleSubmitForm = useCallback(async (e: React.FormEvent) => {
        e.preventDefault()
        if (!content.trim() || isLoading) return

        try {
            const mentions = extractMentions(content)
            await onSubmit(content, mentions)
            setContent('')
        } catch {
            // Handle error silently - UI already shows failure states
        }
    }, [content, isLoading, onSubmit])

    const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
            e.preventDefault()
            handleSubmitForm(e as unknown as React.FormEvent)
            return
        }

        // Close mention suggestions on escape
        if (e.key === 'Escape' && mentionQuery) {
            setMentionQuery('')
            setCursorPosition(null)
        }
    }, [handleSubmitForm, mentionQuery])

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newContent = e.target.value
        setContent(newContent)

        // Handle mention suggestions
        const textarea = e.target
        const cursorPos = textarea.selectionStart
        const textBeforeCursor = newContent.slice(0, cursorPos)
        const matches = textBeforeCursor.match(/@([^\s@]*)$/)

        if (matches) {
            // Get cursor position for suggestion popup
            const rect = textarea.getBoundingClientRect()
            const position = getCaretCoordinates(textarea, cursorPos)
            
            setMentionQuery(matches[1])
            setCursorPosition({
                top: rect.top + position.top,
                left: rect.left + position.left
            })
        } else {
            setMentionQuery('')
            setCursorPosition(null)
        }
    }

    const handleMentionSelect = (user: User) => {
        const textarea = textareaRef.current
        if (!textarea) return

        const cursorPos = textarea.selectionStart
        const textBeforeMention = content.slice(0, cursorPos).replace(/@[^\s@]*$/, '')
        const textAfterMention = content.slice(cursorPos)
        
        const newContent = `${textBeforeMention}@${user.email}${textAfterMention}`
        setContent(newContent)
        setMentionQuery('')
        setCursorPosition(null)
        
        // Set cursor position after the inserted mention
        const newCursorPos = textBeforeMention.length + user.email.length + 1
        textarea.focus()
        textarea.setSelectionRange(newCursorPos, newCursorPos)
    }

    return (
        <form 
            onSubmit={handleSubmitForm} 
            className={cn('space-y-4 relative', className)}
        >
            <Textarea
                ref={textareaRef}
                value={content}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                placeholder="Add an internal note... Use @ to mention users"
                className="min-h-[100px] resize-none"
                disabled={isLoading}
                aria-label="Note content"
            />
            
            {mentionQuery !== '' && cursorPosition && (
                <div
                    style={{
                        position: 'absolute',
                        top: cursorPosition.top + 20, // Offset to show below the cursor
                        left: cursorPosition.left,
                        zIndex: 50
                    }}
                >
                    <MentionSuggestion
                        query={mentionQuery}
                        users={users}
                        currentUserRole={currentUserRole}
                        onSelect={handleMentionSelect}
                        className="min-w-[200px]"
                    />
                </div>
            )}

            <div className="flex justify-end">
                <Button
                    type="submit"
                    disabled={!content.trim() || isLoading}
                >
                    {isLoading ? 'Adding...' : 'Add Note'}
                </Button>
            </div>
            <p className="text-xs text-muted-foreground text-right">
                Press {navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'} + Enter to submit
            </p>
        </form>
    )
}

// Helper function to get caret coordinates in a textarea
function getCaretCoordinates(element: HTMLTextAreaElement, position: number) {
    const { offsetLeft: inputX, offsetTop: inputY } = element
    
    // Create a dummy element to measure text
    const div = document.createElement('div')
    const styles = getComputedStyle(element)
    const properties = [
        'fontFamily', 'fontSize', 'fontWeight', 'wordWrap', 'whiteSpace',
        'borderLeftWidth', 'borderTopWidth', 'paddingLeft', 'paddingTop'
    ] as Array<keyof CSSStyleDeclaration>
    
    properties.forEach(prop => {
        div.style[prop] = styles[prop]
    })
    
    div.textContent = element.value.substring(0, position)
    div.style.position = 'absolute'
    div.style.visibility = 'hidden'
    document.body.appendChild(div)
    
    const coordinates = {
        top: div.offsetHeight + inputY,
        left: div.offsetWidth + inputX
    }
    
    document.body.removeChild(div)
    return coordinates
} 