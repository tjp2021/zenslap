import { useCallback, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { Send } from 'lucide-react'

interface MessageFormProps {
    onSubmit: (content: string) => Promise<void>
    isLoading?: boolean
    className?: string
}

export function MessageForm({ onSubmit, isLoading, className }: MessageFormProps) {
    const [content, setContent] = useState('')

    const handleSubmit = useCallback(async (e: React.FormEvent) => {
        e.preventDefault()
        if (!content.trim() || isLoading) return

        try {
            await onSubmit(content)
            setContent('')
        } catch (error) {
            // Error is handled by parent component
        }
    }, [content, isLoading, onSubmit])

    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleSubmit(e as unknown as React.FormEvent)
        }
    }, [handleSubmit])

    return (
        <form 
            onSubmit={handleSubmit} 
            className={cn('flex gap-2 items-end', className)}
        >
            <Textarea
                value={content}
                onChange={e => setContent(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type your message..."
                className="min-h-[80px] flex-1"
                disabled={isLoading}
            />
            <Button
                type="submit"
                size="icon"
                disabled={!content.trim() || isLoading}
                className="mb-[3px]"
            >
                <Send className="h-4 w-4" />
                <span className="sr-only">Send message</span>
            </Button>
        </form>
    )
} 