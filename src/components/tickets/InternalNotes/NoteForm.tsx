import { useCallback, useState } from 'react'
import { Button, Textarea } from '@/components/ui'
import { cn } from '@/lib/utils'

interface NoteFormProps {
    onSubmit: (content: string) => Promise<void>
    isLoading?: boolean
    className?: string
}

export function NoteForm({ onSubmit, isLoading, className }: NoteFormProps) {
    const [content, setContent] = useState('')

    const handleSubmitForm = useCallback(async (e: React.FormEvent) => {
        e.preventDefault()
        if (!content.trim() || isLoading) return

        try {
            await onSubmit(content)
            setContent('')
        } catch {
            // Handle error silently - UI already shows failure states
        }
    }, [content, isLoading, onSubmit])

    const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
            e.preventDefault()
            handleSubmitForm(e as unknown as React.FormEvent)
        }
    }, [handleSubmitForm])

    return (
        <form 
            onSubmit={handleSubmitForm} 
            className={cn('space-y-4', className)}
        >
            <Textarea
                value={content}
                onChange={e => setContent(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Add an internal note..."
                className="min-h-[100px] resize-none"
                disabled={isLoading}
                aria-label="Note content"
            />
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